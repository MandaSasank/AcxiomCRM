using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using AcxiomCRM.Data;
using AcxiomCRM.Models;
using AcxiomCRM.Services;

namespace AcxiomCRM.Controllers.Api
{
    // DTOs (Section 10 & 17.14: Use DTOs rather than exposing EF entities directly)
    public record LoginRequestDto(string Email, string Password);
    public record CustomerCreateDto(string CustomerName, string Email, string Phone, string? CompanyName, string? Address, string? City, string? State);
    public record LeadCreateDto(string LeadName, string Email, string Phone, string? CompanyName, string? Source, string? Status, decimal ExpectedValue);
    public record OpportunityCreateDto(string OpportunityName, string CustomerId, decimal Amount, string Stage, int Probability, DateTime ExpectedCloseDate, string? Notes);

    [ApiController]
    [Route("api/auth")]
    public class AuthApiController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IAuditService _auditService;

        public AuthApiController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, IAuditService auditService)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _auditService = auditService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto model)
        {
            if (string.IsNullOrEmpty(model.Email) || string.IsNullOrEmpty(model.Password))
                return BadRequest(new { success = false, message = "Email and password are required." });

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null || !user.IsActive)
            {
                await _auditService.LogAsync("anonymous", model.Email, "Failed Login", "Auth", null, null, null, HttpContext.Connection.RemoteIpAddress?.ToString(), "Failure", "User not found or inactive");
                return Unauthorized(new { success = false, message = "Invalid email or password." });
            }

            var result = await _signInManager.PasswordSignInAsync(user.UserName!, model.Password, isPersistent: false, lockoutOnFailure: true);

            if (result.IsLockedOut)
            {
                await _auditService.LogAsync(user.Id, user.FullName, "Failed Login", "Auth", user.Id, null, null, HttpContext.Connection.RemoteIpAddress?.ToString(), "Blocked", "Account locked out");
                return StatusCode(403, new { success = false, message = "Account is temporarily locked due to repeated failed login attempts." });
            }

            if (result.Succeeded)
            {
                var roles = await _userManager.GetRolesAsync(user);
                await _auditService.LogAsync(user.Id, user.FullName, "Login", "Auth", user.Id, null, null, HttpContext.Connection.RemoteIpAddress?.ToString(), "Success", "User logged in successfully");

                return Ok(new
                {
                    success = true,
                    user = new { user.Id, user.FullName, user.Email, Role = roles.FirstOrDefault() ?? "SalesExecutive" }
                });
            }

            await _auditService.LogAsync(user.Id, user.FullName, "Failed Login", "Auth", user.Id, null, null, HttpContext.Connection.RemoteIpAddress?.ToString(), "Failure", "Incorrect password");
            return Unauthorized(new { success = false, message = "Invalid email or password." });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return Ok(new { success = true, message = "Logged out successfully." });
        }
    }

    [ApiController]
    [Route("api/customers")]
    [Authorize]
    public class CustomersApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ICrmValidationService _validationService;
        private readonly IAuditService _auditService;

        public CustomersApiController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, ICrmValidationService validationService, IAuditService auditService)
        {
            _context = context;
            _userManager = userManager;
            _validationService = validationService;
            _auditService = auditService;
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomers([FromQuery] string? search)
        {
            var user = await _userManager.GetUserAsync(User);
            var isSalesExec = await _userManager.IsInRoleAsync(user!, "SalesExecutive");

            var query = _context.Customers.AsQueryable();

            // Role Scope (Section 7: Sales Executive only assigned/created)
            if (isSalesExec)
            {
                query = query.Where(c => c.CreatedBy == user!.Id);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(c => c.CustomerName.Contains(search) || c.Email.Contains(search) || c.Phone.Contains(search) || c.CustomerCode.Contains(search));
            }

            var customers = await query.OrderByDescending(c => c.CreatedDate).ToListAsync();
            return Ok(new { success = true, count = customers.Count, data = customers });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCustomerById(string id)
        {
            var user = await _userManager.GetUserAsync(User);
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null) return NotFound(new { success = false, message = "Customer not found." });

            var isSalesExec = await _userManager.IsInRoleAsync(user!, "SalesExecutive");
            if (isSalesExec && customer.CreatedBy != user!.Id)
                return StatusCode(403, new { success = false, message = "Access denied." });

            return Ok(new { success = true, data = customer });
        }

        [HttpPost]
        public async Task<IActionResult> CreateCustomer([FromBody] CustomerCreateDto dto)
        {
            var user = await _userManager.GetUserAsync(User);
            var customer = new Customer
            {
                CustomerCode = $"CUST-{(_context.Customers.Count() + 101):D5}",
                CustomerName = dto.CustomerName,
                Email = dto.Email,
                Phone = dto.Phone,
                CompanyName = dto.CompanyName ?? "",
                Address = dto.Address ?? "",
                City = dto.City ?? "",
                State = dto.State ?? "",
                CreatedBy = user!.Id
            };

            var (isValid, errorMessage) = await _validationService.ValidateCustomerAsync(customer);
            if (!isValid)
                return BadRequest(new { success = false, message = errorMessage });

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(user.Id, user.FullName, "Create", "Customer", customer.CustomerId, null, customer, HttpContext.Connection.RemoteIpAddress?.ToString(), "Success", $"Customer created: {customer.CustomerName}");

            return CreatedAtAction(nameof(GetCustomerById), new { id = customer.CustomerId }, new { success = true, data = customer });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(string id)
        {
            var user = await _userManager.GetUserAsync(User);
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null) return NotFound(new { success = false, message = "Customer not found." });

            var isSalesExec = await _userManager.IsInRoleAsync(user!, "SalesExecutive");
            if (isSalesExec && customer.CreatedBy != user!.Id)
                return StatusCode(403, new { success = false, message = "Access denied." });

            _context.Customers.Remove(customer);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(user.Id, user.FullName, "Delete", "Customer", id, customer, null, HttpContext.Connection.RemoteIpAddress?.ToString(), "Success", $"Customer deleted: {customer.CustomerName}");

            return Ok(new { success = true, message = "Customer deleted successfully." });
        }
    }

    [ApiController]
    [Route("api/reports")]
    [Authorize]
    public class ReportsApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public ReportsApiController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet("pipeline")]
        public async Task<IActionResult> GetPipelineReport()
        {
            var user = await _userManager.GetUserAsync(User);
            var isSalesExec = await _userManager.IsInRoleAsync(user!, "SalesExecutive");

            var query = _context.Opportunities.AsQueryable();
            if (isSalesExec) query = query.Where(o => o.AssignedTo == user!.Id);

            var opps = await query.ToListAsync();

            var stages = new[] { "Qualification", "Proposal", "Negotiation", "Won", "Lost" };
            var stageBreakdown = stages.Select(stage => new
            {
                Stage = stage,
                Count = opps.Count(o => o.Stage == stage),
                TotalAmount = opps.Where(o => o.Stage == stage).Sum(o => o.Amount),
                WeightedAmount = opps.Where(o => o.Stage == stage).Sum(o => (o.Amount * o.Probability) / 100m)
            });

            return Ok(new
            {
                success = true,
                totalOpenAmount = opps.Where(o => o.Status == "Open").Sum(o => o.Amount),
                totalWeightedAmount = opps.Where(o => o.Status == "Open").Sum(o => (o.Amount * o.Probability) / 100m),
                stageBreakdown
            });
        }
    }
}

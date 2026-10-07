using AcxiomCRM.Data;
using AcxiomCRM.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace AcxiomCRM.Services
{
    public interface IAuditService
    {
        Task LogAsync(string userId, string userName, string action, string entityName, string? recordId, object? oldValue, object? newValue, string? ipAddress, string result, string? details);
    }

    public class AuditService : IAuditService
    {
        private readonly ApplicationDbContext _context;

        public AuditService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(string userId, string userName, string action, string entityName, string? recordId, object? oldValue, object? newValue, string? ipAddress, string result, string? details)
        {
            var log = new AuditLog
            {
                AuditLogId = "aud-" + Guid.NewGuid().ToString("N").Substring(0, 8),
                UserId = userId,
                UserName = userName,
                Action = action,
                EntityName = entityName,
                RecordId = recordId,
                OldValue = oldValue != null ? System.Text.Json.JsonSerializer.Serialize(oldValue) : null,
                NewValue = newValue != null ? System.Text.Json.JsonSerializer.Serialize(newValue) : null,
                IpAddress = ipAddress ?? "127.0.0.1",
                Result = result,
                Details = details,
                CreatedDate = DateTime.UtcNow
            };

            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }

    public interface ICrmValidationService
    {
        Task<(bool IsValid, string? ErrorMessage)> ValidateCustomerAsync(Customer customer, string? currentCustomerId = null);
        (bool IsValid, string? ErrorMessage) ValidateOpportunity(Opportunity opportunity);
        (bool IsValid, string? ErrorMessage) ValidateFollowUp(FollowUp followUp);
    }

    public class CrmValidationService : ICrmValidationService
    {
        private readonly ApplicationDbContext _context;

        public CrmValidationService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<(bool IsValid, string? ErrorMessage)> ValidateCustomerAsync(Customer customer, string? currentCustomerId = null)
        {
            if (string.IsNullOrWhiteSpace(customer.CustomerName))
                return (false, "Customer Name is required.");

            if (string.IsNullOrWhiteSpace(customer.Email) || !Regex.IsMatch(customer.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                return (false, "Enter a valid email address.");

            if (string.IsNullOrWhiteSpace(customer.Phone))
                return (false, "Enter a valid phone number.");

            // Email uniqueness check
            var emailExists = await _context.Customers
                .AnyAsync(c => c.Email.ToLower() == customer.Email.ToLower() && c.CustomerId != currentCustomerId);
            if (emailExists)
                return (false, "A customer with this email address already exists.");

            // Phone uniqueness check
            var phoneExists = await _context.Customers
                .AnyAsync(c => c.Phone == customer.Phone && c.CustomerId != currentCustomerId);
            if (phoneExists)
                return (false, "A customer with this phone number already exists.");

            return (true, null);
        }

        public (bool IsValid, string? ErrorMessage) ValidateOpportunity(Opportunity opportunity)
        {
            if (opportunity.Amount <= 0)
                return (false, "Opportunity Amount must be greater than 0.");

            if (opportunity.Probability < 0 || opportunity.Probability > 100)
                return (false, "Probability must be between 0 and 100.");

            if (opportunity.Status == "Open" && opportunity.ExpectedCloseDate.Date < DateTime.UtcNow.Date)
                return (false, "Expected Close Date cannot be in the past.");

            return (true, null);
        }

        public (bool IsValid, string? ErrorMessage) ValidateFollowUp(FollowUp followUp)
        {
            if (string.IsNullOrWhiteSpace(followUp.Subject))
                return (false, "Subject is required.");

            if (followUp.Status == "Planned" && followUp.FollowUpDate.Date < DateTime.UtcNow.Date)
                return (false, "Follow-up date cannot be earlier than today.");

            return (true, null);
        }
    }
}

using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using AcxiomCRM.Models;

namespace AcxiomCRM.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Lead> Leads => Set<Lead>();
        public DbSet<Opportunity> Opportunities => Set<Opportunity>();
        public DbSet<FollowUp> FollowUps => Set<FollowUp>();
        public DbSet<Activity> Activities => Set<Activity>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Customer indexes & uniqueness (Section 17.5: Email & Phone uniqueness)
            builder.Entity<Customer>()
                .HasIndex(c => c.Email)
                .IsUnique();

            builder.Entity<Customer>()
                .HasIndex(c => c.Phone)
                .IsUnique();

            builder.Entity<Customer>()
                .HasIndex(c => c.CustomerCode)
                .IsUnique();

            // Lead Code Index
            builder.Entity<Lead>()
                .HasIndex(l => l.LeadCode)
                .IsUnique();

            // Opportunity relationship configurations
            builder.Entity<Opportunity>()
                .HasOne(o => o.Customer)
                .WithMany(c => c.Opportunities)
                .HasForeignKey(o => o.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            // AuditLog indexing
            builder.Entity<AuditLog>()
                .HasIndex(a => a.CreatedDate);

            builder.Entity<AuditLog>()
                .HasIndex(a => a.UserId);
        }
    }

    public static class DbInitializer
    {
        public static async Task SeedDataAsync(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var context = serviceProvider.GetRequiredService<ApplicationDbContext>();

            // Seed Roles (Section 7: Admin, Manager, SalesExecutive)
            string[] roles = { "Admin", "Manager", "SalesExecutive" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }

            // Seed Admin User
            var adminEmail = "admin@acxiomcrm.com";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FullName = "Alexander Pierce (Admin)",
                    EmailConfirmed = true,
                    IsActive = true
                };
                await userManager.CreateAsync(adminUser, "Admin@1234");
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }

            // Seed Manager User
            var mgrEmail = "manager@acxiomcrm.com";
            var mgrUser = await userManager.FindByEmailAsync(mgrEmail);
            if (mgrUser == null)
            {
                mgrUser = new ApplicationUser
                {
                    UserName = mgrEmail,
                    Email = mgrEmail,
                    FullName = "Victoria Vance (Manager)",
                    EmailConfirmed = true,
                    IsActive = true
                };
                await userManager.CreateAsync(mgrUser, "Manager@1234");
                await userManager.AddToRoleAsync(mgrUser, "Manager");
            }

            // Seed Sales Executive User
            var salesEmail = "sales@acxiomcrm.com";
            var salesUser = await userManager.FindByEmailAsync(salesEmail);
            if (salesUser == null)
            {
                salesUser = new ApplicationUser
                {
                    UserName = salesEmail,
                    Email = salesEmail,
                    FullName = "David Miller (Sales Executive)",
                    EmailConfirmed = true,
                    IsActive = true
                };
                await userManager.CreateAsync(salesUser, "Sales@1234");
                await userManager.AddToRoleAsync(salesUser, "SalesExecutive");
            }

            // Seed Initial Customer if empty
            if (!context.Customers.Any())
            {
                var cust = new Customer
                {
                    CustomerId = "cust-101",
                    CustomerCode = "CUST-00101",
                    CustomerName = "Acme Global Corp",
                    Email = "contact@acmeglobal.com",
                    Phone = "9876543210",
                    CompanyName = "Acme Global Corporation",
                    Address = "100 Industrial Parkway",
                    City = "Chicago",
                    State = "IL",
                    Status = "Active",
                    CreatedBy = salesUser.Id,
                    CreatedDate = DateTime.UtcNow.AddDays(-30)
                };
                context.Customers.Add(cust);
                await context.SaveChangesAsync();
            }
        }
    }
}

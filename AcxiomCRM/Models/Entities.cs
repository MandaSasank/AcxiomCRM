using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace AcxiomCRM.Models
{
    // Extended Application Identity User (Section 17.4)
    public class ApplicationUser : IdentityUser
    {
        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    }

    // Customer Entity (Section 17.3)
    [Table("Customers")]
    public class Customer
    {
        [Key]
        public string CustomerId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [StringLength(20)]
        public string CustomerCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Customer Name is required.")]
        [StringLength(150)]
        public string CustomerName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Enter a valid email address.")]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone number is required.")]
        [Phone(ErrorMessage = "Enter a valid phone number.")]
        [StringLength(20)]
        public string Phone { get; set; } = string.Empty;

        [StringLength(150)]
        public string CompanyName { get; set; } = string.Empty;

        [StringLength(250)]
        public string Address { get; set; } = string.Empty;

        [StringLength(100)]
        public string City { get; set; } = string.Empty;

        [StringLength(50)]
        public string State { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Active"; // Active, Inactive

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime? ModifiedDate { get; set; }

        [Required]
        public string CreatedBy { get; set; } = string.Empty; // User Id

        [ForeignKey("CreatedBy")]
        public virtual ApplicationUser? Creator { get; set; }

        public virtual ICollection<Opportunity> Opportunities { get; set; } = new List<Opportunity>();
        public virtual ICollection<FollowUp> FollowUps { get; set; } = new List<FollowUp>();
        public virtual ICollection<Activity> Activities { get; set; } = new List<Activity>();
    }

    // Lead Entity (Section 17.3)
    [Table("Leads")]
    public class Lead
    {
        [Key]
        public string LeadId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [StringLength(20)]
        public string LeadCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Lead name is mandatory.")]
        [StringLength(150)]
        public string LeadName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Enter a valid email address.")]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone number is required.")]
        [Phone(ErrorMessage = "Enter a valid phone number.")]
        [StringLength(20)]
        public string Phone { get; set; } = string.Empty;

        [StringLength(150)]
        public string CompanyName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Source { get; set; } = "Website"; // Website, Referral, Cold Call, Social Media, Partner, Email Campaign

        [Required(ErrorMessage = "Lead status is mandatory.")]
        [StringLength(30)]
        public string Status { get; set; } = "New"; // New, Contacted, Qualified, Unqualified, Converted, Lost

        [StringLength(20)]
        public string Priority { get; set; } = "Medium"; // Low, Medium, High

        [Range(0, double.MaxValue, ErrorMessage = "Expected value must be a non-negative number.")]
        public decimal ExpectedValue { get; set; } = 0;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [Required]
        public string AssignedTo { get; set; } = string.Empty; // User Id

        [ForeignKey("AssignedTo")]
        public virtual ApplicationUser? Assignee { get; set; }

        public string? ConvertedCustomerId { get; set; }
        public string? ConvertedOpportunityId { get; set; }
    }

    // Opportunity Entity (Section 17.3)
    [Table("Opportunities")]
    public class Opportunity
    {
        [Key]
        public string OpportunityId { get; set; } = Guid.NewGuid().ToString();

        [Required(ErrorMessage = "Opportunity Name is required.")]
        [StringLength(150)]
        public string OpportunityName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Customer is required.")]
        public string CustomerId { get; set; } = string.Empty;

        [ForeignKey("CustomerId")]
        public virtual Customer? Customer { get; set; }

        public string? LeadId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Opportunity Amount must be greater than 0.")]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        [StringLength(30)]
        public string Stage { get; set; } = "Qualification"; // Qualification, Proposal, Negotiation, Won, Lost

        [Required]
        [Range(0, 100, ErrorMessage = "Probability must be between 0 and 100.")]
        public int Probability { get; set; } = 50;

        [Required(ErrorMessage = "Expected Close Date is required.")]
        public DateTime ExpectedCloseDate { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Open"; // Open, Won, Lost

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [Required]
        public string AssignedTo { get; set; } = string.Empty; // User Id

        [ForeignKey("AssignedTo")]
        public virtual ApplicationUser? Assignee { get; set; }

        [StringLength(1000)]
        public string? Notes { get; set; }

        [NotMapped]
        public decimal WeightedPipeline => (Amount * Probability) / 100m;
    }

    // FollowUp Entity (Section 17.3)
    [Table("FollowUps")]
    public class FollowUp
    {
        [Key]
        public string FollowUpId { get; set; } = Guid.NewGuid().ToString();

        public string? CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public virtual Customer? Customer { get; set; }

        public string? LeadId { get; set; }
        [ForeignKey("LeadId")]
        public virtual Lead? Lead { get; set; }

        public string? OpportunityId { get; set; }
        [ForeignKey("OpportunityId")]
        public virtual Opportunity? Opportunity { get; set; }

        [Required(ErrorMessage = "Follow-up date is required.")]
        public DateTime FollowUpDate { get; set; }

        [Required]
        [StringLength(30)]
        public string FollowUpType { get; set; } = "Call"; // Call, Meeting, Email, Task

        [Required(ErrorMessage = "Subject is required.")]
        [StringLength(200)]
        public string Subject { get; set; } = string.Empty;

        [StringLength(1000)]
        public string Remarks { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Planned"; // Planned, Completed, Missed, Cancelled

        [Required]
        public string AssignedTo { get; set; } = string.Empty;

        [ForeignKey("AssignedTo")]
        public virtual ApplicationUser? Assignee { get; set; }

        public DateTime? CompletedDate { get; set; }
    }

    // Activity Entity (Section 17.3)
    [Table("Activities")]
    public class Activity
    {
        [Key]
        public string ActivityId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [StringLength(30)]
        public string ActivityType { get; set; } = "Call"; // Call, Meeting, Email, Task

        [Required]
        [StringLength(200)]
        public string Subject { get; set; } = string.Empty;

        [StringLength(2000)]
        public string Description { get; set; } = string.Empty;

        public DateTime ActivityDate { get; set; } = DateTime.UtcNow;

        public string? CustomerId { get; set; }
        public string? LeadId { get; set; }

        [Required]
        public string AssignedTo { get; set; } = string.Empty;

        [ForeignKey("AssignedTo")]
        public virtual ApplicationUser? Assignee { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Completed";
    }

    // AuditLog Entity (Section 17.3)
    [Table("AuditLogs")]
    public class AuditLog
    {
        [Key]
        public string AuditLogId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string UserId { get; set; } = string.Empty;

        [StringLength(100)]
        public string UserName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Action { get; set; } = string.Empty; // Login, Failed Login, Logout, Create, Update, Delete, Role Change, Security

        [Required]
        [StringLength(50)]
        public string EntityName { get; set; } = string.Empty; // Customer, Lead, Opportunity, FollowUp, Auth, User

        public string? RecordId { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? OldValue { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? NewValue { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [StringLength(50)]
        public string? IpAddress { get; set; }

        [Required]
        [StringLength(20)]
        public string Result { get; set; } = "Success"; // Success, Failure, Blocked

        [StringLength(500)]
        public string? Details { get; set; }
    }
}

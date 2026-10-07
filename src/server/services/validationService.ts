export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class ValidationService {
  public static isValidEmail(email?: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  public static isValidPhone(phone?: string): boolean {
    if (!phone) return false;
    // Strip common non-digits like spaces, dashes, parens
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    // Standard validation: 10 to 15 digits
    return /^\d{10,15}$/.test(cleanPhone);
  }

  public static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (!password || password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one digit.' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one special character.' };
    }
    return { isValid: true };
  }

  public static validateCustomer(
    payload: any,
    existingCustomers: Array<{ customerId: string; email: string; phone: string }>,
    currentCustomerId?: string
  ): ValidationResult {
    const errors: Record<string, string> = {};

    if (!payload.customerName || typeof payload.customerName !== 'string' || !payload.customerName.trim()) {
      errors.customerName = 'Customer Name is required.';
    } else if (payload.customerName.trim().length > 150) {
      errors.customerName = 'Customer Name cannot exceed 150 characters.';
    }

    if (!payload.email || typeof payload.email !== 'string' || !payload.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!this.isValidEmail(payload.email)) {
      errors.email = 'Enter a valid email address.';
    } else {
      // Check duplicate email
      const dupEmail = existingCustomers.some(
        c => c.customerId !== currentCustomerId && c.email.trim().toLowerCase() === payload.email.trim().toLowerCase()
      );
      if (dupEmail) {
        errors.email = 'A customer with this email address already exists.';
      }
    }

    if (!payload.phone || typeof payload.phone !== 'string' || !payload.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!this.isValidPhone(payload.phone)) {
      errors.phone = 'Enter a valid phone number (min 10 digits).';
    } else {
      // Check duplicate phone
      const cleanTargetPhone = payload.phone.replace(/[\s\-\(\)\+]/g, '');
      const dupPhone = existingCustomers.some(
        c => c.customerId !== currentCustomerId && c.phone.replace(/[\s\-\(\)\+]/g, '') === cleanTargetPhone
      );
      if (dupPhone) {
        errors.phone = 'A customer with this phone number already exists.';
      }
    }

    if (payload.companyName && payload.companyName.length > 150) {
      errors.companyName = 'Company name cannot exceed 150 characters.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  public static validateLead(payload: any): ValidationResult {
    const errors: Record<string, string> = {};

    if (!payload.leadName || typeof payload.leadName !== 'string' || !payload.leadName.trim()) {
      errors.leadName = 'Lead Name is required.';
    }

    if (!payload.email || typeof payload.email !== 'string' || !payload.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!this.isValidEmail(payload.email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!payload.phone || typeof payload.phone !== 'string' || !payload.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!this.isValidPhone(payload.phone)) {
      errors.phone = 'Enter a valid phone number.';
    }

    const validStatuses = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'];
    if (!payload.status || !validStatuses.includes(payload.status)) {
      errors.status = `Lead status is mandatory and must be one of: ${validStatuses.join(', ')}.`;
    }

    if (payload.expectedValue !== undefined && payload.expectedValue !== null) {
      const val = Number(payload.expectedValue);
      if (isNaN(val) || val < 0) {
        errors.expectedValue = 'Expected value must be a non-negative number.';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  public static validateOpportunity(payload: any, isActiveCheck = true): ValidationResult {
    const errors: Record<string, string> = {};

    if (!payload.opportunityName || typeof payload.opportunityName !== 'string' || !payload.opportunityName.trim()) {
      errors.opportunityName = 'Opportunity Name is required.';
    }

    if (!payload.customerId || typeof payload.customerId !== 'string' || !payload.customerId.trim()) {
      errors.customerId = 'Associated Customer is required.';
    }

    // Opportunity Amount rule (Section 5.4: Opportunity Amount = 0 -> reject with "Opportunity Amount must be greater than 0.")
    const amount = Number(payload.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.amount = 'Opportunity Amount must be greater than 0.';
    }

    // Probability rule (Section 5.4: Probability = 101 -> reject with "Probability must be between 0 and 100.")
    const prob = Number(payload.probability);
    if (isNaN(prob) || prob < 0 || prob > 100) {
      errors.probability = 'Probability must be between 0 and 100.';
    }

    // Expected Close Date rule (Section 5.4: Expected Close Date = yesterday -> reject with "Expected Close Date cannot be in the past.")
    if (!payload.expectedCloseDate) {
      errors.expectedCloseDate = 'Expected Close Date is required.';
    } else {
      const closeDate = new Date(payload.expectedCloseDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only check past date if opportunity is active (not already marked Won or Lost)
      const isClosed = payload.stage === 'Won' || payload.stage === 'Lost' || payload.status === 'Won' || payload.status === 'Lost';
      if (isActiveCheck && !isClosed) {
        const closeDateOnly = new Date(closeDate.getFullYear(), closeDate.getMonth(), closeDate.getDate());
        if (closeDateOnly < today) {
          errors.expectedCloseDate = 'Expected Close Date cannot be in the past.';
        }
      }
    }

    const validStages = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    if (payload.stage && !validStages.includes(payload.stage)) {
      errors.stage = `Stage must be one of: ${validStages.join(', ')}.`;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  public static validateFollowUp(payload: any): ValidationResult {
    const errors: Record<string, string> = {};

    if (!payload.subject || typeof payload.subject !== 'string' || !payload.subject.trim()) {
      errors.subject = 'Subject is required.';
    }

    if (!payload.followUpDate) {
      errors.followUpDate = 'Follow-up date is required.';
    } else {
      // Follow-Up Date rule (Section 5.4: Follow-Up Date = yesterday -> reject with: "Follow-up date cannot be earlier than today.")
      const flwDate = new Date(payload.followUpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const flwDateOnly = new Date(flwDate.getFullYear(), flwDate.getMonth(), flwDate.getDate());

      // If status is Planned or New, cannot be earlier than today
      if ((payload.status === 'Planned' || !payload.status) && flwDateOnly < today) {
        errors.followUpDate = 'Follow-up date cannot be earlier than today.';
      }
    }

    const validTypes = ['Call', 'Meeting', 'Email', 'Task'];
    if (payload.followUpType && !validTypes.includes(payload.followUpType)) {
      errors.followUpType = `Follow-Up Type must be one of: ${validTypes.join(', ')}.`;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

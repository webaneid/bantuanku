"use client";

import { useState, useEffect } from "react";
import { normalizePhone, normalizeEmail, normalizeWebsite, isValidEmail, isValidPhone, isValidWebsite } from "@/lib/contact-helpers";

export interface ContactValue {
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
}

interface ContactFormProps {
  value: ContactValue;
  onChange: (contact: ContactValue) => void;
  disabled?: boolean;
  required?: boolean;
  showTitle?: boolean; // Option to hide title if needed
  errors?: {
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    website?: string;
  };
}

export default function ContactForm({ 
  value, 
  onChange, 
  disabled = false,
  required = false,
  showTitle = true,
  errors = {}
}: ContactFormProps) {
  const [localValue, setLocalValue] = useState<ContactValue>(value);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [sameAsPhone, setSameAsPhone] = useState(false);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (field: keyof ContactValue, inputValue: string) => {
    const newValue = { ...localValue, [field]: inputValue };
    
    // If phone changes and sameAsPhone is checked, auto-update WhatsApp
    if (field === 'phone' && sameAsPhone) {
      newValue.whatsappNumber = inputValue;
    }
    
    setLocalValue(newValue);
    onChange(newValue);
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  const handleBlur = (field: keyof ContactValue) => {
    const fieldValue = localValue[field];
    if (!fieldValue) return;

    let error = '';
    
    switch (field) {
      case 'email':
        if (fieldValue && !isValidEmail(fieldValue)) {
          error = 'Format email tidak valid';
        }
        break;
      case 'phone':
      case 'whatsappNumber':
        if (fieldValue && !isValidPhone(fieldValue)) {
          error = 'Nomor telepon harus 10-13 digit, dimulai dengan 0';
        }
        break;
      case 'website':
        if (fieldValue && !isValidWebsite(fieldValue)) {
          error = 'Format website tidak valid';
        }
        break;
    }

    if (error) {
      setValidationErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  return (
    <div className="form-section">
      {showTitle && <h3 className="form-section-title">Informasi Kontak</h3>}
      
      {/* Email */}
      <div className="form-group">
        <label className="form-label">
          Email {required && <span className="text-danger-500">*</span>}
        </label>
        <input
          type="email"
          value={localValue.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          disabled={disabled}
          className="form-input"
          placeholder="contoh@email.com"
          required={required}
        />
        {(errors.email || validationErrors.email) && (
          <p className="text-xs text-danger-500 mt-1">{errors.email || validationErrors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div className="form-group">
        <label className="form-label">Nomor Telepon</label>
        <input
          type="tel"
          value={localValue.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          disabled={disabled}
          className="form-input"
          placeholder="08521234567"
        />
        {(errors.phone || validationErrors.phone) && (
          <p className="text-xs text-danger-500 mt-1">{errors.phone || validationErrors.phone}</p>
        )}
      </div>

      {/* WhatsApp */}
      <div className="form-group">
        <label className="form-label">Nomor WhatsApp</label>
        <input
          type="tel"
          value={localValue.whatsappNumber || ''}
          onChange={(e) => handleChange('whatsappNumber', e.target.value)}
          onBlur={() => handleBlur('whatsappNumber')}
          disabled={disabled || sameAsPhone}
          className="form-input"
          placeholder="08521234567"
        />
        {(errors.whatsappNumber || validationErrors.whatsappNumber) && (
          <p className="text-xs text-danger-500 mt-1">{errors.whatsappNumber || validationErrors.whatsappNumber}</p>
        )}
        
        {/* Checkbox: Same as Phone */}
        {!disabled && (
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="sameAsPhone"
              checked={sameAsPhone}
              onChange={(e) => {
                const checked = e.target.checked;
                setSameAsPhone(checked);
                if (checked) {
                  // Copy phone to WhatsApp when checked
                  const newValue = { ...localValue, whatsappNumber: localValue.phone || '' };
                  setLocalValue(newValue);
                  onChange(newValue);
                }
              }}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="sameAsPhone" className="ml-2 text-sm text-gray-700 cursor-pointer">
              Sama dengan nomor telepon
            </label>
          </div>
        )}
      </div>

      {/* Website */}
      <div className="form-group">
        <label className="form-label">Website</label>
        <input
          type="url"
          value={localValue.website || ''}
          onChange={(e) => handleChange('website', e.target.value)}
          onBlur={() => handleBlur('website')}
          disabled={disabled}
          className="form-input"
          placeholder="https://example.com"
        />
        {(errors.website || validationErrors.website) && (
          <p className="text-xs text-danger-500 mt-1">{errors.website || validationErrors.website}</p>
        )}
      </div>
    </div>
  );
}

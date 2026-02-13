import { newsletterService } from "./newsletterService"
import { validationService } from "./validationService"
// import { OvhDomainService } from "./ovhService"
import { emailService } from "./emailService"
import { ecommerceService } from "./ecommerceService"
import { sendgridConfigService } from "./sendgridConfigService"
import { withNewsletterAuth as _nlGuard, authenticateNewsletterAdmin as _nlVerify } from "./utils/newsletterAuth"

// Main services object
export const sharedServices = {
  newsletter: newsletterService,
  validation: validationService,
  ecommerce: ecommerceService,
  // ovh: OvhDomainService,
  email: emailService,
  sendgrid: sendgridConfigService,
  _internal: {
    _nlGuard,
    _nlVerify,
  },
}

# sms

## Description

SMS delivery via Twilio for OTP verification and transactional notifications. A
`sendSms(to, message)` helper wraps the Twilio REST API (no native bindings,
Worker-compatible). Primary use cases are phone number verification and 2FA code
delivery when TOTP is unavailable. SMS is optional — apps that don't need it can
remove this facet without touching auth.

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._

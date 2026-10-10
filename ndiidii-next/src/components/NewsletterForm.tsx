'use client';

/**
 * Newsletter form. TODO: connect to an email service (Mailchimp, Resend, etc.).
 * Not wired yet — kept as a client component because it holds a submit handler.
 */
export default function NewsletterForm() {
  return (
    <form className="footer__form" onSubmit={(e) => e.preventDefault()}>
      <label className="sr-only" htmlFor="newsletter-email">
        Email
      </label>
      <input id="newsletter-email" type="email" placeholder="Email" required />
      <button type="submit">Join</button>
    </form>
  );
}

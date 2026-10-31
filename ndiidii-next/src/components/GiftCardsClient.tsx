'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { formatNaira } from '@/lib/format';
import { GIFT_CARD_AMOUNTS_NGN } from '@/lib/store.config';

function GiftCardsInner() {
  const params = useSearchParams();
  const revealCode = params.get('reveal');
  const revealAmount = Number(params.get('amount')) || 50000;

  const [amount, setAmount] = useState(50000);
  const [recipient, setRecipient] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(revealCode);
  const [doneAmount, setDoneAmount] = useState(revealAmount);

  // balance check
  const [checkCode, setCheckCode] = useState('');
  const [checkResult, setCheckResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const buy = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Recipient's email is required.");
      return;
    }
    setPaying(true);
    try {
      // 1. Initialize a Paystack transaction for the gift card amount.
      const res = await fetch('/api/giftcard/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          amountNaira: amount,
          note: message,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not start payment');
      // Remember what to create once payment returns.
      sessionStorage.setItem(
        'ndiidii-giftcard-pending',
        JSON.stringify({ amountNaira: amount, note: message, reference: json.reference }),
      );
      window.location.href = json.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be started');
      setPaying(false);
    }
  };

  const checkBalance = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(`/api/giftcard/balance?code=${encodeURIComponent(checkCode)}`);
      const json = await res.json();
      if (res.ok && json.found) {
        setCheckResult({ ok: true, text: `Balance: ${formatNaira(json.balance)}` });
      } else if (res.status === 404) {
        setCheckResult({ ok: false, text: 'No gift card found with that code.' });
      } else {
        setCheckResult({ ok: false, text: json.error || 'Could not check balance.' });
      }
    } catch {
      setCheckResult({ ok: false, text: 'Could not check balance.' });
    } finally {
      setChecking(false);
    }
  };

  // If we just returned from paying, create the card and reveal the code.
  if (done) {
    return (
      <div className="container giftcards">
        <div className="gdone">
          <p className="eyebrow gdone__eyebrow">Gift card ready</p>
          <h1 className="serif gdone__title">Here's the code</h1>
          <div className="gdone__code">{done}</div>
          <p className="gdone__hint">
            Share this code with {recipient ? recipient : 'the recipient'}. They enter it at checkout
            and the {formatNaira(doneAmount)} comes off their total. Valid for 12 months.
          </p>
          <Link href="/gift-cards" className="btn btn--ghost-dark" onClick={() => setDone(null)}>
            Buy another
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container giftcards">
      <header className="giftcards__head">
        <p className="eyebrow giftcards__eyebrow">Gift Cards</p>
        <h1 className="serif giftcards__title">Give Ndiidii</h1>
        <p className="giftcards__sub">For someone whose taste you don't know yet — or just want to spoil.</p>
      </header>

      <div className="giftcards__layout">
        {/* card preview */}
        <div className="gcard">
          <div className="gcard__brand">Ndiidii Scents</div>
          <div className="gcard__mid">
            <p className="serif gcard__label">Gift Card</p>
          </div>
          <div className="gcard__foot">
            <span className="gcard__amount">{formatNaira(amount)}</span>
            <span className="gcard__validity">Valid 12 months</span>
          </div>
        </div>

        {/* purchase form */}
        <form
          className="gform"
          onSubmit={(e) => {
            e.preventDefault();
            buy();
          }}
        >
          <div className="gform__toggle" role="group" aria-label="Card type">
            <button type="button" className="is-active" disabled>
              Virtual
            </button>
            <button type="button" disabled title="Physical cards coming soon">
              Physical
            </button>
          </div>

          <div className="gform__group">
            <span className="gform__label">Choose an amount</span>
            <div className="gform__amounts">
              {GIFT_CARD_AMOUNTS_NGN.map((a) => (
                <button
                  type="button"
                  key={a}
                  className={`gform__amount ${amount === a ? 'is-active' : ''}`}
                  onClick={() => setAmount(a)}
                >
                  {formatNaira(a)}
                </button>
              ))}
            </div>
          </div>

          <div className="gform__group">
            <label className="gform__label" htmlFor="gc-recipient">
              Recipient's name
            </label>
            <input id="gc-recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          </div>

          <div className="gform__group">
            <label className="gform__label" htmlFor="gc-email">
              Recipient's email
            </label>
            <input
              id="gc-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="they@example.com"
            />
          </div>

          <div className="gform__group">
            <label className="gform__label" htmlFor="gc-message">
              Gift message
            </label>
            <textarea
              id="gc-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write something they'll enjoy opening..."
            />
          </div>

          {error && <p className="gform__error" role="alert">{error}</p>}
          <button type="submit" className="gform__submit" disabled={paying}>
            {paying ? 'Redirecting to payment…' : 'Add Gift Card to Bag'}
          </button>
        </form>
      </div>

      {/* balance check */}
      <section className="gbalance">
        <h2 className="serif gbalance__title">Check a Gift Card Balance</h2>
        <p className="gbalance__sub">Enter a code to see how much is left on it.</p>
        <div className="gbalance__row">
          <input
            value={checkCode}
            onChange={(e) => setCheckCode(e.target.value)}
            placeholder="NDII-XXXX-XXXX"
            aria-label="Gift card code"
          />
          <button type="button" onClick={checkBalance} disabled={checking || !checkCode.trim()}>
            {checking ? '…' : 'Check'}
          </button>
        </div>
        {checkResult && (
          <p className={`gbalance__result ${checkResult.ok ? '' : 'is-error'}`}>
            {checkResult.ok ? <strong>{checkResult.text}</strong> : checkResult.text}
          </p>
        )}
      </section>
    </div>
  );
}

export default function GiftCardsClient() {
  return (
    <Suspense fallback={<div className="container giftcards" style={{ minHeight: '50vh' }} />}>
      <GiftCardsInner />
    </Suspense>
  );
}

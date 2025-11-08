"use client";
import { signIn } from "next-auth/react";

export default function SignInCard() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 md:grid-cols-2 md:gap-20 md:py-24">
        {/* LEFT: Logo, heading, Google button */}
        <div className="max-w-lg">
          <div className="mb-10 inline-flex items-center gap-3">
            {/* Uses /public/airtable-favicon.ico (keep or swap to /airtable.svg) */}
            <img
              src="/airtable-favicon.ico"
              alt="Airtable"
              className="h-15 w-15"
              loading="eager"
            />
          </div>

          <h1 className="text-4xl font-semibold leading-tight text-slate-900">
            Sign in to Airtable
          </h1>

          <div className="h-8" />

          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="group inline-flex w-full max-w-md items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
          >
            <span className="mr-3 inline-flex h-5 w-5 items-center justify-center">
              <GoogleMark className="h-5 w-5" />
            </span>
            Continue with Google
          </button>
        </div>

        {/* RIGHT: promo image with hover enlarge */}
        <div className="justify-self-end translate-x-6 md:translate-x-10 mt-6 md:mt-10">
          <div className="group inline-block">
            <img
              src="/omni_signin_medium2x.png"
              alt="Meet Omni promo"
              width={395}
              height={580}
              className="
                block w-[395px] h-auto rounded-3xl ring-1 ring-black/5 shadow-xl
                transform transition
                duration-300 ease-out
                group-hover:scale-[1.03] group-hover:shadow-2xl
              "
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Google icon (official paths) ---------- */

function GoogleMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" {...props}>
      <path d="M17.64,9.20454545 C17.64,8.56636364 17.5827273,7.95272727 17.4763636,7.36363636 L9,7.36363636 L9,10.845 L13.8436364,10.845 C13.635,11.97 13.0009091,12.9231818 12.0477273,13.5613636 L12.0477273,15.8195455 L14.9563636,15.8195455 C16.6581818,14.2527273 17.64,11.9454545 17.64,9.20454545 L17.64,9.20454545 Z" fill="#4285F4"></path>
      <path d="M9,18 C11.43,18 13.4672727,17.1940909 14.9563636,15.8195455 L12.0477273,13.5613636 C11.2418182,14.1013636 10.2109091,14.4204545 9,14.4204545 C6.65590909,14.4204545 4.67181818,12.8372727 3.96409091,10.71 L0.957272727,10.71 L0.957272727,13.0418182 C2.43818182,15.9831818 5.48181818,18 9,18 L9,18 Z" fill="#34A853"></path>
      <path d="M3.96409091,10.71 C3.78409091,10.17 3.68181818,9.59318182 3.68181818,9 C3.68181818,8.40681818 3.78409091,7.83 3.96409091,7.29 L3.96409091,4.95818182 L0.957272727,4.95818182 C0.347727273,6.17318182 0,7.54772727 0,9 C0,10.4522727 0.347727273,11.8268182 0.957272727,13.0418182 L3.96409091,10.71 L3.96409091,10.71 Z" fill="#FBBC05"></path>
      <path d="M9,3.57954545 C10.3213636,3.57954545 11.5077273,4.03363636 12.4404545,4.92545455 L15.0218182,2.34409091 C13.4631818,0.891818182 11.4259091,0 9,0 C5.48181818,0 2.43818182,2.01681818 0.957272727,4.95818182 L3.96409091,7.29 C4.67181818,5.16272727 6.65590909,3.57954545 9,3.57954545 L9,3.57954545 Z" fill="#EA4335"></path>
    </svg>
  );
}

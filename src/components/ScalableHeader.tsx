// src/components/ScalableHeader.tsx
import React from 'react';

export function ScalableHeader() {
  // Exact proportions mapped to a 96px baseline
  const emYellowThickness = '0.104em';   // 10px / 96px
  const emDashThickness = '0.104em';     // 10px / 96px
  const emDashSpacing = '0.406em';       // 39px gap
  const emDashMargin = '0.146em';        // 14px top/bottom
  const emCwWidth = '1.26em';            // 121px width
  const emCwStripeThickness = '0.219em'; // 21px stripe height
  const emRightMargin = '0.333em';       // 32px spacing before crosswalk

  const dashCount = 6;
  const cwCount = 4;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center md:items-start z-10 px-4 md:px-0 mt-2 sm:mt-4 md:mt-6">
      <div
        className="flex flex-row items-stretch mx-auto md:mx-0 w-max max-w-full"
        style={{ fontSize: 'clamp(2rem, 6vw, 6rem)' }}
      >
        {/* Left Column (Lines & Text) */}
        <div className="flex flex-col items-center justify-between w-max max-w-full">

          {/* Top Stripped Lines */}
          <div
            className="flex flex-row items-center justify-between w-full"
            style={{ gap: emDashSpacing }}
          >
            {[...Array(dashCount)].map((_, i) => (
              <div
                key={i}
                className="bg-slate-900 rounded-none"
                style={{ height: emDashThickness, flex: '1 1 auto' }}
              />
            ))}
          </div>

          {/* Text */}
          <h1
            className="font-black tracking-tighter leading-none whitespace-nowrap text-slate-900 drop-shadow-sm"
            style={{
              fontSize: '1em',
              marginTop: emDashMargin,
              marginBottom: emDashMargin
            }}
          >
            CLASE-B.CL
          </h1>

          {/* Bottom Yellow Line */}
          <div
            className="bg-yellow-400 w-full rounded-none"
            style={{ height: emYellowThickness }}
          />
        </div>

        {/* Right Column (Crosswalk) */}
        <div
          className="flex flex-col justify-between shrink-0"
          style={{ width: emCwWidth, marginLeft: emRightMargin }}
        >
          {[...Array(cwCount)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-900 rounded-none w-full"
              style={{ height: emCwStripeThickness }}
            />
          ))}
        </div>
      </div>

      {/* Subtitle */}
      <p className="mt-4 md:mt-6 text-lg sm:text-xl md:text-2xl font-bold whitespace-nowrap text-slate-600 mx-auto md:mx-0">
        Practica y Aprende. Tu licencia te espera!
      </p>
    </div>
  );
}
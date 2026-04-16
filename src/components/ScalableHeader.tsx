interface ScalableHeaderProps {
  // Em-based proportions (defaults based on 96px design)
  emYellowThickness?: string;    // default: '0.104em' (10px / 96px)
  emDashThickness?: string;      // default: '0.104em' (10px / 96px)
  emDashMargin?: string;         // default: '0.146em' (14px / 96px)
  emCwWidth?: string;            // default: '1.26em' (121px / 96px)
  emCwStripeThickness?: string;  // default: '0.219em' (21px / 96px)
  emRightMargin?: string;        // default: '0.333em' (32px / 96px)
  dashCount?: number;            // default: 8
  cwCount?: number;              // default: 8
  isDarkMode?: boolean;          // default: false
}

export function ScalableHeader({
  emYellowThickness = '0.104em',
  emDashThickness = '0.104em',
  emDashMargin = '0.146em',
  emCwWidth = '1.26em',
  emCwStripeThickness = '0.219em',
  emRightMargin = '0.333em',
  dashCount = 6,
  cwCount = 4,
  isDarkMode = false,
}: ScalableHeaderProps) {
  return (
    <section
      className={`
        relative flex w-full flex-col items-center overflow-x-hidden px-4
        text-[24px] sm:text-[32px] md:text-[64px] lg:text-[96px] landscape:text-[32px]
        py-[0.3em] sm:py-[0.35em] md:py-[0.4em] lg:py-[0.5em]
        min-h-full ${isDarkMode ? 'bg-slate-900' : 'bg-white'}
      `}
    >
      {/* Background Pattern */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none ${
          isDarkMode ? 'opacity-20' : 'opacity-[0.05]'
        }`}
        style={{
          backgroundImage: `radial-gradient(${isDarkMode ? '#ffffff' : '#4f46e5'} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent pointer-events-none ${
          isDarkMode ? 'from-indigo-500/20' : 'from-indigo-500/10'
        }`}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-[0.5em]">
        {/* Asfalto Header (Intersection) */}
        <div
          className={`
            max-w-2xl text-center md:text-left flex flex-col items-center md:items-start
            mx-auto md:mx-0 w-full overflow-hidden
          `}
          style={{ paddingTop: '0.2em' }}
        >
          <div className="flex flex-row items-stretch mx-auto md:mx-0 w-max max-w-full">
            {/* Left Column (Lines & Text) */}
            <div className="flex flex-col items-center justify-between w-max max-w-full">
              {/* Top Stripped Lines */}
              <div className="flex flex-row items-center justify-between w-full">
                {[...Array(dashCount)].map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-none transition-colors duration-300 ${
                      isDarkMode ? 'bg-white' : 'bg-slate-900'
                    }`}
                    style={{
                      height: emDashThickness,
                      width: '12%',
                    }}
                  />
                ))}
              </div>

              {/* Text */}
              <h1
                className={`
                  text-[1em] font-black tracking-tighter leading-none
                  drop-shadow-sm ${isDarkMode ? 'text-white drop-shadow-md' : 'text-slate-900'}
                `}
                style={{
                  marginTop: emDashMargin,
                  marginBottom: emDashMargin,
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
              style={{
                marginLeft: emRightMargin,
                width: emCwWidth,
              }}
            >
              {[...Array(cwCount)].map((_, i) => (
                <div
                  key={i}
                  className={`rounded-none transition-colors duration-300 ${
                    isDarkMode ? 'bg-white' : 'bg-slate-900'
                  }`}
                  style={{
                    height: emCwStripeThickness,
                    width: '100%',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tagline / Subtitle */}
          <p
            className={`
              font-bold whitespace-nowrap leading-relaxed mx-auto md:mx-0 px-4 md:px-0
              text-[0.5em] md:text-[0.65em]
              ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}
            `}
            style={{ marginTop: '0.3em' }}
          >
            Practica y Aprende. Tu licencia te espera!
          </p>
        </div>
      </div>
    </section>
  );
}

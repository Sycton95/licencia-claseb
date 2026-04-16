/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary Actions & Progress (Calm Blue)
        primary: {
          50: '#F0F7FF',
          100: '#E0EEFF',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Success & Correct Answers (Soft Teal)
        success: {
          50: '#F0FDFD',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // Warnings & Errors (Warm Coral)
        warning: {
          50: '#FEF8F5',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#F97316',
          500: '#F97316',
          600: '#C2410C',
          700: '#9A3412',
          800: '#7C2D12',
          900: '#431407',
        },
        // Neutral & Surfaces (Warm Gray)
        neutral: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716F',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
        // Secondary/Exam Mode (Sage Green)
        sage: {
          50: '#F6FDF5',
          100: '#ECFDF5',
          200: '#D1FAE5',
          300: '#A7F3D0',
          400: '#86EFAC',
          500: '#6EE7B7',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#145231',
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        geist: ['Geist', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Typographic Scale
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '900' }],
        'h2': ['24px', { lineHeight: '1.2', fontWeight: '800' }],
        'h3': ['20px', { lineHeight: '1.2', fontWeight: '700' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label': ['14px', { lineHeight: '1', fontWeight: '500' }],
        'small': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        'xs': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'tiny': ['11px', { lineHeight: '1', fontWeight: '400' }],
      },
      spacing: {
        // Semantic spacing (base unit 4px)
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
      },
      letterSpacing: {
        tight: '-0.01em',
        normal: '0em',
        wide: '0.15em',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('landscape', '@media (orientation: landscape)');
      addVariant('portrait', '@media (orientation: portrait)');
    },
  ],
};

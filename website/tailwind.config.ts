import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
theme: {
  extend: {
    colors: {
      netflix: {
        red: '#e50914',
        dark: '#141414',
      },
      disney: {
        blue: '#0063e5', 
        dark: '#132c5b',
      },
      hbo: {
        purple: '#5822b4',
        dark: '#2d1a50',
      },
      prime: {
        blue: '#00A8E1',
        dark: '#232F3E',
      }
    },
  },
},
  plugins: [],
}

export default config
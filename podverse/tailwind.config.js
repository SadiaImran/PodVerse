/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors:{
        'neutral-900' : '#17191d',
        'neutral-500' : '#c9cacd',
        'primary-500' :'#806fe1'
      },
      fontFamily :{
        InriaSerif : ['Inria Serif', 'serif'],
        OpenSans :['Open Sans', 'sans-serif'],
        Rubik :['Rubik', 'serif']
      }
    },
  },
  plugins: [],
}


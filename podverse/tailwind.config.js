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
        'primary-500' :'#806fe1',
        'blue-600' :'#7c69e7'
      },
    },
    fontFamily :{
      InriaSerif : ['Inria Serif', 'serif'],
      OpenSans :['Open Sans', 'sans-serif'],
      Rubik :['Rubik', 'serif']
    },
    container : {
      center : true ,
      padding : "1rem",
      screens :{
        lg : "1124px" ,
        xl : "1124px" , 
        "2xl" : "1124px",
      }
    }
  },
  plugins: [],
}


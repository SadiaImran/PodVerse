import PropTypes from 'prop-types'
function AuthWelcome(props) {

  return (
    <><div className='centered-div'>
      <h1 className={
        `text-3xl 
          font-HeadingPoppins
          font-bold 
          text-neutral-900
          `}>{props.title}</h1>
      <h2 className=
      {`text-xl 
        font-medium 
        font-subheadingDMSans 
        text-neutral-500 mt-2`}
      >{props.subtitle}</h2></div>
    </>
  )
}
AuthWelcome.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string
}

export default AuthWelcome

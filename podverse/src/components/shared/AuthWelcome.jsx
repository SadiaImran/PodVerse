import PropTypes from 'prop-types'
function AuthWelcome(props) {

  return (
    <><div className='centered-div'>
      <h1 className={
        `text-3xl 
          font-InriaSerif 
          font-bold 
          text-neutral-900`}>{props.title}</h1>
      <h2 className=
      {`text-xl 
        font-medium 
        font-InriaSerif 
        text-neutral-500`}
      >{props.subtitle}</h2></div>
    </>
  )
}
AuthWelcome.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string
}
AuthWelcome.defaultProps = {
  title: "Let's Get Started",
  subtitle: "Create your account"
}

export default AuthWelcome

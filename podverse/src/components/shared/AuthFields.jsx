import PropTypes from 'prop-types'

function AuthFields({type,purpose,placeholder,IconComponent}) {
  return (
    <>
    <div className={
        `container
        bg-neutral-100
        rounded-xl
        text-neutral-400
        flex px-10 py-2 items-center gap-3
        text-base
        w-1/3
        font-OpenSans
        `}>
    {<IconComponent />}
    <input type={type} name={type} id={`${purpose}-${type}`} placeholder={placeholder} className={`bg-neutral-100 outline-none`}/>
    </div>
     </>
  )
}
AuthFields.propTypes = {
  type: PropTypes.string.isRequired,
  purpose: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  IconComponent: PropTypes.elementType.isRequired,
}

export default AuthFields
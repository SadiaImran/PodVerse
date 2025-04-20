import PropTypes from 'prop-types'
import { useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

function AuthFields({ type, purpose, placeholder, IconComponent }) {
  const [showPassword, setShowPassword] = useState(false)

  const isPasswordField = type === 'password'
  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="w-full bg-neutral-100 rounded-xl text-neutral-600 flex px-4 py-3 items-center gap-3 text-base font-bodyRoboto">
      <IconComponent className="text-lg" />
      <input
        type={inputType}
        name={type}
        id={`${purpose}-${type}`}
        placeholder={placeholder}
        className="bg-neutral-100 outline-none w-full"
      />
      {isPasswordField && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="focus:outline-none text-gray-500"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      )}
    </div>
  )
}

AuthFields.propTypes = {
  type: PropTypes.string.isRequired,
  purpose: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  IconComponent: PropTypes.elementType.isRequired,
}

export default AuthFields

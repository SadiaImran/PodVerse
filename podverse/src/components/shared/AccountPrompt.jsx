import PropTypes from 'prop-types';
function AccountPrompt(props){
    return (
    <>
    <div className='centered-div'>
        <h4 className="text-sm text-neutral-900 font-OpenSans font-medium">{props.quesText}
        <button className="text-primary-500 font-bold ml-1"> {props.buttonText}</button></h4>
    </div>
    </>
    );
 }

 AccountPrompt.propTypes = {
    quesText : PropTypes.string , 
    buttonText : PropTypes.string
 }

export default AccountPrompt;
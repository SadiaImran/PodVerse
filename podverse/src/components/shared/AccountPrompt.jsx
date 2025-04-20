import PropTypes from 'prop-types';
function AccountPrompt(props){
    return (
    <>
    <div className='centered-div text-center'>
        <h4 className="text-sm text-neutral-900 font-bodyRoboto font-medium">{props.quesText}
        <button className="text-light-deepPurple font-bold ml-1"> {props.buttonText}</button></h4>
    </div>
    </>
    );
 }

 AccountPrompt.propTypes = {
    quesText : PropTypes.string , 
    buttonText : PropTypes.string
 }

export default AccountPrompt;
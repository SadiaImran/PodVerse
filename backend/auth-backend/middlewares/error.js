<<<<<<< HEAD
<<<<<<< HEAD
export const errorHandler = (err ,req , res , next) =>{
=======
const errorHandler = (err ,req , res , next) =>{
>>>>>>> 16c741c9d22d80cef982a17e96ba15788da19171
=======
const errorHandler = (err ,req , res , next) =>{
>>>>>>> reconfigure-1-SI
    const statusCode  = res.statusCode === 200 ? 500 : res.statusCode ; 

    return res.status(statusCode).json(
        {
            success : false , 
            error : err.message
        }
    );
<<<<<<< HEAD
<<<<<<< HEAD
};
=======
};
module.exports = { errorHandler };
>>>>>>> 16c741c9d22d80cef982a17e96ba15788da19171
=======
};
module.exports = { errorHandler };
>>>>>>> reconfigure-1-SI

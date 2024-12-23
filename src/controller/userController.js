const User = require("../models/user.js")
const bcrypt = require("bcryptjs")
const {checkSchema} = require("express-validator")
const { userValidator } = require("../utils/userValidation.js")
const jwt = require("jsonwebtoken")
const blacklisted = require("../models/blacklist.js")
//This controller route creates the user and hash's the password before storing into DB

const createUser =  async (req, res)=>{
    //first check to see if the email already exits
    const {name, email, password, date_of_birth }= req.body

    try{
        const existingUser = await User.findOne({email});
        if(existingUser)
            {res.status(400).send({msg:"User already exits with that email"})
    }
    //--------------------------------
    // change salt value so it gets generated diff for each pass using bcrypt.genSalt
    //--------------------------------
    const hashedPashword = await bcrypt.hash(password,10)

    const newUser = new User({
        name: name,
        email:email,
        password: hashedPashword,
        date_of_birth:date_of_birth

    })

    await newUser.save();
    res.status(201).send({msg:"Thank You for Registering With Us"})

    }catch(error){
        console.error(`Error: ${error}`)
        res.status(500).send({msg:"Server Error"})
    }

}

const login = async (req,res, next)=>{
    try{

        const {email, password} = req.body
        const user = await User.findOne({email})
        
     
        //if the user does not exist then throw error
        if(!user){
            return res.status(404).json({msg:"Authentication failed"})
        }

        //comparing to see if they gave the correct pass
        await  bcrypt.compare(password, user.password, (err, result) => {
           if (err) {
             return res.status(401).json({msg:"Invalid Credentials"})
           }

           if (result) {
             const token = jwt.sign(
               { userId: user._id },
                 process.env.JWT_SECRET,
               {
                 expiresIn: "1h",
               }
             );

             //cookie sets here
             let options={
                maxAge:60*60*1000, // this will keep the cookie alive for 20 mins
                httpOnly:true, // the cookies is only accessable in the wbe
                //use secure in production change this val
                //secure:true,
                sameSite:"Strict"
             }
             res.cookie("SessionID", token, options)
             res.status(200).json({ 
                msg:"you have been successfully logged in"
             });
           } else {
             res.status(401).json({ msg: "Invalid Passowrd" });
           }
         });
        
       
    }catch(err){
        next(err);
    }
}


const logout = async (req,res)=>{
    try{
        const accessToken = req.cookies.SessionID

        if (!accessToken){return res.sendStatus(204)}
            //check if the token has already expired
        const decodedToken = jwt.decode(accessToken);
        if(decodedToken && decodedToken.exp < Date.now()/1000){
            return res.status(204).json({msg:"token has already expired, please re-login"})
        }

        //additional check to see if the token has been blacklisted

        const checkIfBlackListed = await blacklisted.findOne({
          token: accessToken,
        });

        if(checkIfBlackListed){
            return res.sendStatus(204)
        }

        //if the token isn't blacklisted then black list it
        const newBlackList = new blacklisted({
            token:accessToken
        })

        await newBlackList.save()
        res.setHeader("Clear-Site-Data", "cookies")
        res.clearCookie("SessionID",{
                httpOnly:true, // the cookies is only accessable in the wbe
                //use secure in production change this val
                //secure:true,
                sameSite:"Strict"
        })
        res.sendStatus(200).json({
            message:"Successfully Logged out"
        })

    }catch(err){
        console.error(err)
        res.status(500).json({
            status:'Error',
            message:"Internal Server Error"
        })
    }
}






module.exports = {
  createUser,
  login,
  logout
};

const {Schema} = require("mongoose")
const mongoose = require("mongoose")
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, maxLength: 25 },
  email:{type:String, required:true, unique:true},
  //password length will be validated in untils
  password: { type: String, required: true},
  date_of_birth: {type: Date}

});

const User =mongoose.model('User', userSchema)
module.exports = User;
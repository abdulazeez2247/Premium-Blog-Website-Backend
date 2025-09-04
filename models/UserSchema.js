const express = require('express');
const mongoose = require('mongoose')

const user = mongoose.Schema(
    {

        fullName:{
            type:String,
            required:[true , 'Please enter your firstname'],
            trim:true,
        },
        Lastname:{
            type:String,
            required:[true , 'Please enter your lastname'],
            trim:true,
        },
        username:{
            type:String,
            required:[true , 'Please enter your lastname'],
            trim:true,
        },
        email:{
            type:String,
            required:[true , 'Please enter your email'],
            trim:true,
            unique:true,
            match:[/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ ,'enter a valid email' ]
        },
        password:{
            type:String,
            required:[true , 'Please enter your password'],
            minLength:[7 , 'password must contain at least 7 character '],
            maxLength:[1028 , 'password should not exceed 1028'],
            trim:true,
        },
        isVerified:{
            type:Boolean,
            default:false
        }
    },
    {
        timestamps:true
    }
)

const usermodel = mongoose.model('users', user);
module.exports = usermodel
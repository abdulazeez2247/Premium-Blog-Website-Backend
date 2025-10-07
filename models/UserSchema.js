const express = require('express');
const mongoose = require('mongoose')

const user = mongoose.Schema(
    {
        Firstname:{
            type:String,
            required:[true , 'Please enter your firstname'],
            trim:true,
        },
        Lastname:{
            type:String,
            required:[true , 'Please enter your lastname'],
            trim:true,
        },
        Username:{
            type:String,
            required:[true , 'Please enter your username'],
            trim:true,
            unique: true
        },
        email:{
            type:String,
            required:[true , 'Please enter your email'],
            trim:true,
            unique:true,
            match:[/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ ,'enter a valid email' ]
        },
        Password:{
            type:String,
            required:[true , 'Please enter your password'],
            minLength:[7 , 'password must contain at least 7 character '],
            maxLength:[1028 , 'password should not exceed 1028'],
            trim:true,
        },
        Phonenumber: {
            type: String,
            required: [true, 'Please enter your phone number'],
            trim: true,
        },
        Country: {
            type: String,
            required: [true, 'Enter your country'],
            trim: true,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        isVerified:{
            type:Boolean,
            default:false
        },
        profilePicture: {
            type: String,
            default: ''
        },
        bio: {
            type: String,
            default: '',
            maxLength: [500, 'Bio should not exceed 500 characters']
        },
        isActive: {
            type: Boolean,
            default: true
        },
        subscription: {
            plan: {
                type: String,
                enum: ['free', 'premium'],
                default: 'free'
            },
            status: {
                type: String,
                enum: ['active', 'inactive', 'cancelled'],
                default: 'inactive'
            },
            expiresAt: {
                type: Date
            }
        }
    },
    {
        timestamps:true
    }
)

const usermodel = mongoose.model('users', user);
module.exports = usermodel
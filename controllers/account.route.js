const express = require('express');
const bcrypt = require('bcryptjs');
const authen = require('../models/authen.model');
const passport = require('passport');
const router = express.Router();
var nodemailer =  require('nodemailer');
function sendOTP(email) {
    var transporter =  nodemailer.createTransport({ // config mail server
        service: 'Gmail',
        auth: {
            user: 'tqtnk20003@gmail.com',
            pass: 'wBh7x5P3ETm72JgMqRWn'
        }
    });
    const randomOTP = Math.floor(100000 + Math.random() * 900000);
    var mainOptions = { // thiết lập đối tượng, nội dung gửi mail
        from: 'Yasuo News',
        to: email,
        subject: 'Xác nhận đăng ký tài khoản Yasuo News',
        html: '<b>Xin chào,</b><p>Bạn đã đăng ký thành công tài khoản tại Yasuo News. Mã OTP của bạn là: </p> <h1>'+randomOTP+'</h1><p>Vui lòng sử dụng mã OTP này để hoàn tất việc đăng ký tài khoản. OTP có hiệu lực trong 3 giờ.</p></br><p>Yasuo News</p>'
    }
    transporter.sendMail(mainOptions, function(err, info){
        if (err) {
            console.log(err);
            return null;
        } else {
            console.log('Message sent: ' +  info.response);
        }
    });
    return randomOTP;
};

function sendResetOTP(email) {
  var transporter =  nodemailer.createTransport({ // config mail server
      service: 'Gmail',
      auth: {
          user: 'tqtnk20003@gmail.com',
          pass: 'wBh7x5P3ETm72JgMqRWn'
      }
  });
  const randomOTP = Math.floor(100000 + Math.random() * 900000);
  var mainOptions = { // thiết lập đối tượng, nội dung gửi mail
      from: 'Yasuo News',
      to: email,
      subject: 'Đặt lại mật khẩu tài khoản',
      html: '<b>Xin chào,</b><p>Bạn đã yêu cầu đặt lại mật khẩu tài khoản tại Yasuo News. Mã OTP của bạn là: </p> <h1>'+randomOTP+'</h1><p>Vui lòng sử dụng mã OTP này để đặt lại mật khẩu cho tài khoản của bạn. OTP có hiệu lực trong 3 giờ.</p></br><p>Yasuo News</p>'
  }
  transporter.sendMail(mainOptions, function(err, info){
      if (err) {
          console.log(err);
          return null;
      } else {
          console.log('Message sent: ' +  info.response);
      }
  });
  return randomOTP;
};


router.get('/register',authen.isNotAuth, function (req, res) {
  res.render('accountView/register', {
    layout: 'account.hbs'
  });
})

router.post('/register',authen.isNotAuth, async function (req, res) {
  const hash = bcrypt.hashSync(req.body.password, 10);
  const dob = req.body.dob + ' 00:00:00';
  const user = {
    HoTen: req.body.fullname,
    NgaySinh: dob,
    GioiTinh: req.body.gender,
    Email: req.body.email,
    TenDangNhap: req.body.username,
    MatKhau: hash,
    LoaiNguoiDung: 'guest',
    TinhTrang: 1
  }
  const OTPcheck = await authen.checkOTP(req.body.OTP,req.body.email);
  const emailCheck = await authen.checkUniqueEmail(req.body.email);
  if (OTPcheck && emailCheck)
    {
    await authen.addGuest(user);
    req.flash('succ_message','Đã đăng ký thành công! Vui lòng đăng nhập.');
    }
  else if (!OTPcheck) {
    req.flash('err_message','OTP bị lỗi hoặc đã quá hạn!');
  }
  else {
    req.flash('err_message','Email đã được sử dụng, vui lòng sử dụng email khác!');
  }
  res.redirect('login');
})

router.get('/send-OTP',authen.isNotAuth, async function (req,res){
  const email = req.query.email;
  const OTP = sendOTP(email);
  if (OTP === null) {
    return res.json(false);
  }
  await authen.saveOTP(OTP,email);
  res.json(true);
})

router.get('/send-reset-OTP',authen.isNotAuth, async function (req,res){
  const email = req.query.email;
  const OTP = sendResetOTP(email);
  if (OTP === null) {
    return res.json(false);
  }
  await authen.saveOTP(OTP,email);
  res.json(true);
})

router.get('/is-available', async function (req, res) {
  if (req.query.user) {
    const username = req.query.user;
    const user = await authen.checkUsername(username);
    if (user === null) {
      return res.json(false);
    }
    res.json(true);
  }
  else if (req.query.email) {
    const email = req.query.email;
    const check = await authen.checkUniqueEmail(email);
    if (check) {
      return res.json(false);
    }
    res.json(true);
  }
})

router.get('/login', authen.isNotAuth, async function (req, res) {
  const err_message = req.flash('err_message');
  const succ_message = req.flash('succ_message');
  res.render('accountView/login', {
    layout: 'account.hbs',
    err_message: err_message,
    succ_message: succ_message
  });
});

// process the login form
router.post('/login',authen.isNotAuth, passport.authenticate('local-login', {
  session :false,
  failureRedirect : '/account/login', // redirect back to the signup page if there is an error
  failureFlash : true // allow flash messages
}), (req, res) => {
  if (req.body.remember) {
    req.session.cookie.maxAge = 1000 * 60 * 3;
  } else {
    req.session.cookie.expires = false;
  }
  res.redirect('/news/home');
});

router.get('/facebook-login',authen.isNotAuth, passport.authenticate('facebook-login', {
  session :false,
  successRedirect : '/',
  failureRedirect : '/account/login', // redirect back to the signup page if there is an error
}));

router.get('/facebook-login/callback',authen.isNotAuth, passport.authenticate('facebook-login', {
  session :false,
  failureRedirect : '/account/login', // redirect back to the signup page if there is an error
  failureFlash : true // allow flash messages
}), (req, res) => {
  
  console.log(req.user);
  req.session.auth=true;
  req.session.authUser = req.user;
  res.redirect('/news/home');
});


router.post('/logout',authen.isAuth, async function (req, res) {
  req.session.auth = false;
  req.session.authUser = null;
  const url = '/news/home';
  res.redirect(url);
})

router.get('/get-ButDanh',authen.isAuth, async function (req, res) {
  const idNguoiDung = req.query.id;
  const rows = await authen.layButDanh(idNguoiDung);
  if (rows === null) {
    return res.json('NULL');
  }
  res.json(rows[0].ButDanh);
});

router.get('/profile',authen.isAuth, function (req, res) {
  res.render('accountView/profile');
});

router.post('/change_profile',authen.isAuth, async function (req, res) {
  const dob = req.body.dob + ' 00:00:00';

  await authen.CapNhat(req.session.authUser.idNguoiDung,req.body.fullname,req.body.email,dob);
  if (req.body.ButDanh)
  {
    await authen.CapNhatButDanh(req.session.authUser.idNguoiDung,req.body.ButDanh);
  }
  req.session.authUser.HoTen=req.body.fullname;
  req.session.authUser.Email=req.body.email;
  req.session.authUser.NgaySinh=dob;
  const url = '/news/home';
  res.redirect(url);
})

router.get('/profile_password',authen.isAuth, function (req, res) {
  res.render('accountView/passwordChange');
});

router.post('/profile_password',authen.isAuth, async function (req, res) {
  console.log(req.body);
  const checkPassword = await authen.checkPasswordMatch(req.session.authUser.idNguoiDung,req.body.oldpassword);
  console.log(checkPassword);
  if (checkPassword)
  {
    await authen.changePasswordWithId(req.session.authUser.idNguoiDung,req.body.newpassword);
  }
  const url = '/news/home';
  res.redirect(url);
})

router.get('/reset_password',authen.isNotAuth, function (req, res) {
  res.render('accountView/passwordForgot', {
    layout: 'account.hbs'
  });
})

router.post('/reset_password',authen.isNotAuth, async function (req, res) {
  const OTPcheck = await authen.checkOTP(req.body.OTP,req.body.email);
  if (OTPcheck)
    {
    await authen.changePasswordWithEmail(req.body.email,req.body.password);
    req.flash('succ_message','Đã đổi mật khẩu! Vui lòng đăng nhập.');
    }
  else {
    req.flash('err_message','OTP bị lỗi hoặc đã quá hạn!');
  }
  res.redirect('login');
})




module.exports = router;


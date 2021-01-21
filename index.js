const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();

const url = "mongodb://localhost:27017/postDB";

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
    secret: "Our little secrete",
    resave: false,
    saveUninitialized: false,
    //cookie: { secure: false } 
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(url, {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);


const postSchema = new mongoose.Schema({
    author: String,
    title: String,
    description: String,
    company: String,
    link: String,
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
      }
    ]
});

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    name: String,
    account: String,
    company: String
  });

  const commentSchema = new mongoose.Schema({
    text: String,
    auther: String
  });
  
userSchema.plugin(passportLocalMongoose);

const Post = new mongoose.model("Post", postSchema);

const User = new mongoose.model("User", userSchema);

const Comment = new mongoose.model("Comment", commentSchema);

passport.use(User.createStrategy());

passport.use(
  new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    // Match user
    User.findOne({
      email: email
    }).then(user => {
      if (!user) {
        return done(null, false/*, { message: 'That email is not registered' }*/);
      }
      //console.log(password);
      //console.log(user.password);
      // Match password
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false/*, { message: 'Password incorrect' }*/);
        }
      });
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/** get routes */

app.get("/", function(req, res) {
  if (req.isAuthenticated()){
    res.redirect("/home");
  }else{
    res.render("login");
  }
});

/**GET REQUEST FOR HOME */

app.get("/home", function(req, res){
  Post.find({}, function(err, posts){
        res.render("home", {
            posts: posts,
            accountType: req.user.account
        });
    });
});

/**GET REQUEST FOR REGISTER */

app.get("/register", function(req, res){
    res.render("register");
});

/**GET REQUEST FOR LOGIN */

app.get("/login", function(req, res){
  //console.log("asad");
    res.render("login");
});

/**GET REQUEST FOR LOGOUT */

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

/**GET REQUEST FOR POST */
app.get("/profile", function(req, res){
  if(req.user.account === "alumina"){
    Post.find({author: req.user.name}, function(err, posts){
      res.render("profile", {

          posts: posts
      });
    });
  }
  else{
    res.send("Your not authorised !!");
  }
});

/**GET REQUEST FOR POST */
app.get("/post", function(req, res){
    
    if (req.isAuthenticated()){
      if(req.user.account === "alumina"){
        res.render("post");
      }
      else{
        res.send("Your not authorised to post!!");
      }  
    } else {
        res.redirect("/login");
    }
});

/**GET REQUEST FOR POST_DETAILS */
app.get("/posts/:postId", function(req, res){
    const requestedPostId = req.params.postId;
    
    Post.findOne({_id: requestedPostId}).populate("comments").exec(function(err, post){
        //console.log(post.title);
        if(post){
            res.render("postdetails", {
                accountType: req.user.account,
                post: post
            });
        }
    });
});

/**get route to update */
app.get("/updatePost/:post_id", function(req, res){
  const postid = req.params.post_id;
  //console.log(postid);
  Post.findOne({_id:postid},function(err,post){
    if(post){
      
      res.render("updatePost",{
        post: post
      });
    }else{
      console.log(err);
    }
  });
  
});


/** post routes */


/**POST REQUEST FOR LOGIN */ 

app.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login'
    //failureFlash: true
  })(req, res, next);
});

/**POST REQUEST FOR REGISTER */ 
app.post('/register', function(req, res){
  //const { name, email, password} = req.body;
  
    User.findOne({ email: req.body.email }).then(user => {
      if (user) {
        console.log(user);
        console.log("sdasd");
      } else {
        let newUser;
        if(req.body.account === "student")
        {
            newUser = new User({
            email: req.body.email,
            password: req.body.password,
            name: req.body.name,
            account: req.body.account
          });
        }
        else{
           newUser = new User({
            email: req.body.email,
            password: req.body.password,
            name: req.body.name,
            account: req.body.account,
            company: req.body.company
          });
        }
        

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser.save(function(err){
              //console.log(req.body.email);
              //console.log(newUser);
              if(!err)
                res.redirect("/");
              else  
                console.log(err);  
            });
              
          });
        });
      }
    });
  }
);

/**POST REQUEST FOR TO ADD POST */  
app.post("/post", function(req, res){
  
  
    const post = new Post ({
        author : req.user.name,
        company : req.user.company,
        title : req.body.postTitle,
        description : req.body.postDescription,
        link : req.body.postLink
    });
    
    
    post.save(function(err){
        if (!err){
            res.redirect("/home");
            //console.log("aaa");
        }
    });
});

/**POST REQUEST TO Comment on post */

app.post('/posts/:id/comments', function(req,res){
  //const text = req.body.text;
  //const auther = req.user.name;
  const comment = new Comment({
    text: req.body.text,
    auther: req.user.name
  });
  //console.log(req.params.id);
  const idd = req.params.id.substring(1);
  
  Post.findOne({_id: idd}, function(err, post){
    if(err){
      console.log(err);
      res.redirect("/home");
    }else{
      //console.log(comment);
      comment.save(function(err){
        if(err){
          console.log(err);
        }else{
          post.comments.push(comment);
          post.save();
          //console.log(req.params.id);
          res.redirect("/posts/" + idd);
          //console.log("aaa");
        }
      });
    }
  });
  
});

/**POST REQUEST TO UPDATE POST */
app.post('/update', function(req,res){
  const id = req.body.id;
  console.log(id);
  const updatedPost = {
      author : req.user.name,
      company : req.user.company,
      title : req.body.postTitle,
      description : req.body.postDescription,
      link : req.body.postLink
  };
  console.log(updatedPost);
  Post.updateOne({_id: id},updatedPost,{ upsert: true }, function(err, post){
    if(!err){
      res.redirect("/profile");
    }
  });

});

/**POST REQUEST TO DELETE POST */
app.post('/delete', function(req, res){
  const post_id = req.body.post_id;
  //console.log(req.body);
  Post.findOneAndDelete({_id:post_id}, function(err){
    if(!err){
      res.redirect("profile");
    }
    else{
      console.log(err);
    }
  });
});


app.listen(8000, function(){
  console.log('Example app listening on port 8000!')
});
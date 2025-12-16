const {findUser, findUserById} = require("../db/pool")
const bcrypt = require("bcryptjs")
const LocalStrategy = require('passport-local').Strategy;

module.exports = function(passport) {
    passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
        const { rows } = await findUser(username);
        const user = rows[0];

        if (!user) {
            return done(null, false, { message: "Incorrect username" });
        }
        let match = false
        for (i = 0; i < rows.length; ++i) {
            match = await bcrypt.compare(password, rows[i].password)
            if (match) {break}
        }
        if (!match) {
            return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
        } catch(err) {
        return done(err);
        }
    })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const { rows } = await findUserById(id);
            const user = rows[0];

            done(null, user);
        } 
        catch(err) {
            done(err);
        }
    });
}
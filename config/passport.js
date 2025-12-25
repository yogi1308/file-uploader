const {findUser, findUserById} = require("../lib/queries")
const bcrypt = require("bcryptjs")
const LocalStrategy = require('passport-local').Strategy;

module.exports = function(passport) {
    passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            let user = null
            const rows = await findUser(username);
            if (!rows || rows.length === 0) {
                return done(null, false, { message: "Incorrect username" });
            }
            let match = false
            for (i = 0; i < rows.length; ++i) {
                match = await bcrypt.compare(password, rows[i].password)
                if (match) {user = rows[i]; break}
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
            const user = await findUserById(id);
            done(null, user);
        } 
        catch(err) {
            done(err);
        }
    });
}
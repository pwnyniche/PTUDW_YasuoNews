const db = require("../utils/db");

module.exports = {
    addAPI(name, link) {
        const row = {
            name: name,
            link: link
        };
        return db("api").insert(row);
    },

    load() {
        return db("api");
    },

    deleteAPI(idVal) {
        return db("api").where("idAPI",idVal).del();
    },
};
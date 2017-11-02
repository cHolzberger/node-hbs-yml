var yt = require("../src/index");

t = yt("test.hbs");

t().then((tmpl) => {
  console.log(tmpl.rendered);
})


tl = yt("layout-user.hbs");

tl().then((tmpl) => {
  console.log(tmpl.rendered);
})
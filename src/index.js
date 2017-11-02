var Handlebars = require("handlebars");
var yamlFront = require('yaml-front-matter');
var fs = require('fs');
var _ = require('lodash');
var deref = require('json-schema-deref');

function loadTemplate(templatePath,data) {
  var templateContent = fs.readFileSync(templatePath);
  var templateVars = yamlFront.loadFront(templateContent);
  var content = templateVars.__content;
  var layout = undefined;

  delete templateVars.__content;

  if ( data ) {
    templateVars = Object.assign(data,templateVars);
  }

  if (templateVars._ && templateVars._.layout) {
    layout = loadTemplate(templateVars._.layout);
  }


  var r = {
    "hbs": Handlebars.compile(content),
    vars: templateVars,
    layout: layout
  };
  return r;
}

function renderVars(template) {
  var p = new Promise((resolve, reject) => {
    deref(template.vars, function (err, fullSchema) {
      template.vars = fullSchema;
      for (var key in template.vars) {
        if (_.isString(template.vars[key])) {
          template.vars[key] = Handlebars.compile(template.vars[key])(template.vars);
        }
      }

      resolve(template);
    })
  });
  return p;
}

function renderContent(template) {
  // compile it the first time, moving strings from front matter inside the template
  var pass1 = template.hbs(template.vars);

  // compile it the second time replacing eventual strings inside front matter with variables
  var pass2 = Handlebars.compile(pass1)(template.vars);
  template.rendered = pass2;

  return template;
}

function load(templatePath) {
  var tmpl = loadTemplate(templatePath);
  return (data) => {
    return renderTemplate(tmpl, data);
  }
}

function renderTemplate(template, data) {
    if ( data ) {
      template.vars = Object.assign(data,template.vars);
    }
    console.dir(template);
    //template.vars.data = data;
    var p = renderVars(template).then( (template) => { 
      if ( template.layout ) {
        return renderVars(template.layout).then(() => {
          template.vars.layout = template.layout.vars;
          
          return template;
        });
      }
      return template;
    }).then( (template)=>{
      template = renderContent(template);

      if (template.layout) {
        template.layout.vars._ = {
          body: template.rendered
        };
        template = renderContent(template.layout);
      }
      return template;
    });
    return p;
}

renderTemplate.Promise = Promise;
module.exports = load;
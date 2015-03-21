
'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jasmine = require('gulp-jasmine');
var reporters = require('jasmine-reporters');


var settings = {
  js: {
    root: 'lib/*.js'
  },
  test: {
    root: 'spec/*.spec.js'
  }
};


gulp.task('lint', function() {
  return gulp.src([settings.js.root, settings.test.root])
             .pipe(jshint())
             .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('test', function() {
  return gulp.src(settings.test.root)
             .pipe(jasmine({
               includeStackTrace: true,
               verbose: true,
               reporter: new reporters.TapReporter()
             }));
});

gulp.task('watch', ['lint', 'test'], function() {
  gulp.watch(settings.js.root, ['lint', 'test']);
  gulp.watch(settings.test.root, ['lint', 'test']);
});

gulp.task('testing', ['test'], function() {
  gulp.watch(settings.js.root, ['test']);
  gulp.watch(settings.test.root, ['test']);
});

gulp.task('default', ['watch']);

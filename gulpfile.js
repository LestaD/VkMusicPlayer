var gulp = require('gulp');
var del = require('del');
var flatten = require('gulp-flatten');

var paths = {
    src: './**',
    clean: ['build'],
    dest: 'build',
    watch: 'src/**/*.*'
};

gulp.task('clean', function (cb) {
    del([paths.dest], cb);
});

gulp.task('cleanBuild', function (cb) {
    del([paths.dest + '/css/*.scss'], cb);
});

function cleanBuild() {

}

gulp.task('copy', ['clean'], function (cb) {
    gulp.src(paths.src, {base: "./src/"})
        .pipe(gulp.dest(paths.dest));

    del([paths.dest + '/css/*.scss'], cb);
});

gulp.task('watch', function () {
    gulp.watch(paths.watch, ['copy', 'cleanBuild']);
});

gulp.task('default', ['watch', 'copy', 'cleanBuild']);
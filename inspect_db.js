const mongoose = require('mongoose');
const { mongodb } = require('./backend/config/env');
const Student = require('./backend/models/Student');
const Subject = require('./backend/models/Subject');
const Chapter = require('./backend/models/Chapter');

const inspect = async () => {
    try {
        await mongoose.connect(mongodb.uri);
        console.log('[Inspect] Connected.');

        const students = await Student.find();
        console.log('[Inspect] Students:', students.map(s => ({ id: s._id, name: s.name, class_num: s.class_num })));

        const subjects = await Subject.find();
        console.log('[Inspect] Subjects:', subjects.map(s => ({ id: s._id, name: s.name, class_num: s.class_num })));

        const chapters = await Chapter.find();
        console.log('[Inspect] Chapters:', chapters.map(c => ({ id: c._id, title: c.title, subject_id: c.subject_id })));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspect();

import { Model, Column } from './decorators';
import { BaseModel } from './model';

@Model('test')
class TestModel extends BaseModel {
	@Column({
		name: 'id',
		type: 'INT4',
	})
	id: number;
}

// const test = new TestModel();
// test['fromSql']({ id: 2 });

const test1 = new TestModel();
test1.fromSql({ id: 1 });

const test2 = new TestModel();
test2.fromSql({ id: 2 });

const sql = TestModel.manyToSql([test1, test2]);
console.log({ sql });

// console.log(test.id);

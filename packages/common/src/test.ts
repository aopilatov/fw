import { ActionService, Container, Service, UseAction, UseService, ValidationService, Repository } from './di';
import { UseRepository } from './di/decoratorsInject/repository';
import { UseRequest, Request } from './request';

@Repository()
class TestRepository {}

@Service()
class TestService {
	@UseRequest() private readonly request: Request;
	@UseRepository() private readonly repository: TestRepository;

	public test() {
		console.log(this.request.id);
	}
}

@ActionService()
class TestAction {
	@UseService() public readonly service: TestService;
}

@ValidationService()
class TestValidation {
	@UseAction() public readonly action: TestAction;
}

const testValidation = Container.of('test').getValidation(TestValidation);
testValidation.action.service.test();

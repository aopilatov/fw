import { ActionService, Container, Service, UseAction, UseService, ValidationService, Repository } from './di';
import { UseRepository } from './di/decoratorsInject/repository';
import { UseRequest, Request } from './request';

@Repository()
class TestRepository {}

@Service()
class TestService {
	@UseRequest() private readonly request: Request;
	@UseRepository() private readonly repository: TestRepository;
}

@ActionService()
class TestAction {
	@UseService() private readonly service: TestService;
}

@ValidationService()
class TestValidation {
	@UseAction() private readonly action: TestAction;
}

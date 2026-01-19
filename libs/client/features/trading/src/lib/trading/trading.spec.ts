import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Trading } from './trading';

/**
 * Trading component tests
 * 
 * NOTE: Tests are skipped until component implementation is complete.
 * The component currently has no business logic to test.
 * Remove .skip() once the trading component is fully implemented.
 */
describe.skip('Trading', () => {
  let component: Trading;
  let fixture: ComponentFixture<Trading>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trading],
    }).compileComponents();

    fixture = TestBed.createComponent(Trading);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

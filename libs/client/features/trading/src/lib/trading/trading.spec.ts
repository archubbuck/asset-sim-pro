import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Trading } from './trading';

describe('Trading', () => {
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

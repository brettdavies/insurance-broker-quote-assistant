import { AgeEvaluator } from './age-evaluator'
import { CreditEvaluator } from './credit-evaluator'
import { DrivingRecordEvaluator } from './driving-record-evaluator'
import type { EligibilityEvaluator } from './evaluator-interface'
import { PropertyTypeEvaluator } from './property-type-evaluator'
import { VehicleEvaluator } from './vehicle-evaluator'

/**
 * Eligibility Evaluator Factory
 *
 * Creates and manages eligibility evaluators for routing engine.
 * Uses strategy pattern to allow extensible eligibility evaluation.
 */
export class EvaluatorFactory {
  private evaluators: EligibilityEvaluator[]

  constructor() {
    // Register all evaluators
    this.evaluators = [
      new AgeEvaluator(),
      new VehicleEvaluator(),
      new CreditEvaluator(),
      new PropertyTypeEvaluator(),
      new DrivingRecordEvaluator(),
    ]
  }

  /**
   * Get all registered evaluators
   */
  getAllEvaluators(): EligibilityEvaluator[] {
    return this.evaluators
  }

  /**
   * Register a new evaluator
   */
  registerEvaluator(evaluator: EligibilityEvaluator): void {
    this.evaluators.push(evaluator)
  }
}

/**
 * Default evaluator factory instance
 */
export const defaultEvaluatorFactory = new EvaluatorFactory()

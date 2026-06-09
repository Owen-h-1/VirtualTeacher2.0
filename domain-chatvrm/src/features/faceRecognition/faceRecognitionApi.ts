export type ExpressionData = {
  expression: string;
  engagement_score: number;
  learning_state: {
    description: string;
  };
  intervention?: {
    state: string;
    suggestions: string[];
  };
};

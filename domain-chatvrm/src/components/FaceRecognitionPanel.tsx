import React from 'react';

type ExpressionData = {
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

type Props = {
  onExpressionUpdate: (data: ExpressionData) => void;
  onInterventionTrigger: (intervention: NonNullable<ExpressionData['intervention']>) => void;
};

export const FaceRecognitionPanel: React.FC<Props> = () => {
  return null;
};

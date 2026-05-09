import { ExpressionData } from './faceRecognitionApi';

export interface TeachingAdjustment {
  action: 'slow_down' | 'speed_up' | 'repeat' | 'explain_more' | 'engage' | 'normal';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedResponse?: string;
}

class TeachingStrategyService {
  private expressionHistory: ExpressionData[] = [];
  private maxHistoryLength = 20;
  private lastAdjustment: TeachingAdjustment | null = null;
  private adjustmentCooldown = 5000;
  private lastAdjustmentTime = 0;

  addExpressionData(data: ExpressionData): void {
    this.expressionHistory.push(data);
    if (this.expressionHistory.length > this.maxHistoryLength) {
      this.expressionHistory.shift();
    }
  }

  getTeachingAdjustment(): TeachingAdjustment | null {
    const now = Date.now();
    if (now - this.lastAdjustmentTime < this.adjustmentCooldown) {
      return this.lastAdjustment;
    }

    if (this.expressionHistory.length < 3) return null;

    const recentExpressions = this.expressionHistory.slice(-5);
    const currentState = recentExpressions[recentExpressions.length - 1].learning_state.state;
    const avgEngagement = recentExpressions.reduce((sum, e) => sum + e.engagement_score, 0) / recentExpressions.length;

    let adjustment: TeachingAdjustment | null = null;

    switch (currentState) {
      case 'confused':
        adjustment = {
          action: 'explain_more',
          reason: '学生表现出困惑，需要更详细的解释',
          priority: 'high',
          suggestedResponse: '让我用另一种方式来解释这个概念，或者我们换个例子看看？'
        };
        break;

      case 'frustrated':
        adjustment = {
          action: 'slow_down',
          reason: '学生感到困难，建议放慢教学节奏',
          priority: 'high',
          suggestedResponse: '看起来这个部分有点难懂，我们慢一点，一步一步来。'
        };
        break;

      case 'disengaged':
        adjustment = {
          action: 'engage',
          reason: '学生注意力分散，需要增加互动性',
          priority: 'medium',
          suggestedResponse: '嘿！让我们换个方式学习这个内容，你觉得怎么样？'
        };
        break;

      case 'curious':
        adjustment = {
          action: 'speed_up',
          reason: '学生表现出好奇心，可以适当加快节奏或深入探讨',
          priority: 'low',
          suggestedResponse: '很好！既然你感兴趣，我们可以深入了解更多细节。'
        };
        break;

      case 'engaged':
        if (avgEngagement > 0.8) {
          adjustment = {
            action: 'normal',
            reason: '学生学习状态良好，保持当前节奏',
            priority: 'low'
          };
        }
        break;
    }

    if (adjustment) {
      this.lastAdjustment = adjustment;
      this.lastAdjustmentTime = now;
    }

    return adjustment;
  }

  getLearningAnalytics(): {
    averageEngagement: number;
    dominantExpression: string;
    stateDistribution: Record<string, number>;
    trend: 'improving' | 'declining' | 'stable';
    recommendations: string[];
  } {
    if (this.expressionHistory.length === 0) {
      return {
        averageEngagement: 0.5,
        dominantExpression: 'neutral',
        stateDistribution: {},
        trend: 'stable',
        recommendations: ['需要更多数据进行分析']
      };
    }

    const avgEngagement = this.expressionHistory.reduce((sum, e) => sum + e.engagement_score, 0) / this.expressionHistory.length;

    const expressionCounts: Record<string, number> = {};
    for (const expr of this.expressionHistory) {
      expressionCounts[expr.expression] = (expressionCounts[expr.expression] || 0) + 1;
    }
    
    const dominantExpression = Object.keys(expressionCounts).reduce((a, b) => 
      expressionCounts[a] > expressionCounts[b] ? a : b, 'neutral');

    const stateCounts: Record<string, number> = {};
    for (const expr of this.expressionHistory) {
      stateCounts[expr.learning_state.state] = (stateCounts[expr.learning_state.state] || 0) + 1;
    }

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (this.expressionHistory.length >= 10) {
      const firstHalf = this.expressionHistory.slice(0, Math.floor(this.expressionHistory.length / 2));
      const secondHalf = this.expressionHistory.slice(Math.floor(this.expressionHistory.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, e) => sum + e.engagement_score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, e) => sum + e.engagement_score, 0) / secondHalf.length;
      
      if (secondAvg - firstAvg > 0.1) trend = 'improving';
      else if (firstAvg - secondAvg > 0.1) trend = 'declining';
    }

    const recommendations: string[] = [];
    
    if (avgEngagement < 0.4) {
      recommendations.push('建议增加互动环节，提高学生参与度');
    }
    
    if (stateCounts['confused'] > this.expressionHistory.length * 0.3) {
      recommendations.push('频繁出现困惑状态，建议检查教学方法是否合适');
    }
    
    if (stateCounts['disengaged'] > this.expressionHistory.length * 0.25) {
      recommendations.push('学生注意力容易分散，考虑使用更多视觉化内容');
    }

    if (trend === 'declining') {
      recommendations.push('参与度呈下降趋势，建议及时调整教学策略');
    }

    return {
      averageEngagement: avgEngagement,
      dominantExpression,
      stateDistribution: stateCounts,
      trend,
      recommendations
    };
  }

  clearHistory(): void {
    this.expressionHistory = [];
    this.lastAdjustment = null;
  }
}

export const teachingStrategyService = new TeachingStrategyService();

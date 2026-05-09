import React, { useState, useEffect, useRef, useCallback } from 'react';
import { faceRecognitionService, ExpressionData } from '@/features/faceRecognition/faceRecognitionApi';

interface FaceRecognitionPanelProps {
  onExpressionUpdate?: (expression: ExpressionData) => void;
  onInterventionTrigger?: (intervention: NonNullable<ExpressionData['intervention']>) => void;
}

const expressionEmojis: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  neutral: '😐',
  confused: '😕',
  bored: '😴',
  focused: '🤔'
};

const expressionNames: Record<string, string> = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  surprised: '惊讶',
  neutral: '中性',
  confused: '困惑',
  bored: '无聊',
  focused: '专注'
};

export const FaceRecognitionPanel: React.FC<FaceRecognitionPanelProps> = ({
  onExpressionUpdate,
  onInterventionTrigger
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentExpression, setCurrentExpression] = useState<ExpressionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<string>('');
  const [analysisCount, setAnalysisCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopCamera = useCallback(() => {
    console.log('[FaceRec] Stopping camera...');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    console.log('[FaceRec] Starting camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('[FaceRec] Camera started successfully');
      }

      setTimeout(() => startAnalysis(), 500);
    } catch (err) {
      const errorMsg = '无法访问摄像头，请检查权限设置';
      setError(errorMsg);
      console.error('[FaceRec] Camera error:', err, errorMsg);
      
      // 提供详细的解决方案
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('摄像头权限被拒绝，请在浏览器地址栏左侧允许摄像头权限');
        } else if (err.name === 'NotFoundError') {
          setError('未检测到摄像头，请确保设备已连接摄像头');
        }
      }
    }
  };

  const startAnalysis = () => {
    console.log('[FaceRec] Starting analysis loop...');
    if (intervalRef.current) clearInterval(intervalRef.current);

    let frameCount = 0;
    intervalRef.current = setInterval(async () => {
      try {
        if (!canvasRef.current || !videoRef.current) {
          console.warn('[FaceRec] Canvas or Video not ready');
          return;
        }

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx || video.videoWidth === 0 || video.readyState < 2) {
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        frameCount++;
        setAnalysisCount(frameCount);

        console.log(`[FaceRec] Analyzing frame ${frameCount}...`);

        const expressionData = await faceRecognitionService.analyzeFrame(imageDataUrl);
        
        console.log('[FaceRec] Analysis result:', expressionData);
        setCurrentExpression(expressionData);
        
        if (onExpressionUpdate) {
          onExpressionUpdate(expressionData);
        }

        if (expressionData.intervention && onInterventionTrigger) {
          console.log('[FaceRec] Intervention triggered:', expressionData.intervention);
          onInterventionTrigger(expressionData.intervention);
        }
      } catch (err) {
        console.error('[FaceRec] Analysis error:', err);
        // 不设置错误状态，继续尝试（网络临时故障等）
      }
    }, 300); // 每300ms分析一次
  };

  const handleStart = async () => {
    console.log('[FaceRec] ===== START BUTTON CLICKED =====');
    setIsInitializing(true);
    setError(null);
    
    try {
      console.log('[FaceRec] Starting session with backend...');
      const sessionData = await faceRecognitionService.startSession();
      console.log('[FaceRec] Session started:', sessionData);
      setSessionInfo(`会话ID: ${sessionData.session_id.substring(0, 8)}...`);
      
      setIsActive(true);
      setIsInitializing(false);
      
      console.log('[FaceRec] Now starting camera...');
      await startCamera();
      
      console.log('[FaceRec] ===== FACE RECOGNITION STARTED SUCCESSFULLY =====');
    } catch (err) {
      console.error('[FaceRec] Start error:', err);
      setIsInitializing(false);
      
      let errorMessage = '无法连接到表情识别服务';
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查：\n1. 人脸识别服务是否已启动\n2. 网络连接是否正常\n3. 防火墙是否阻止了请求';
      } else if (err instanceof Error) {
        errorMessage = `启动失败: ${err.message}`;
      }
      setError(errorMessage);
    }
  };

  const handleStop = async () => {
    console.log('[FaceRec] ===== STOP BUTTON CLICKED =====');
    
    stopCamera();
    
    try {
      await faceRecognitionService.endSession();
      console.log('[FaceRec] Session ended');
    } catch (err) {
      console.error('[FaceRec] End session error:', err);
    }
    
    setIsActive(false);
    setCurrentExpression(null);
    setSessionInfo('');
    setAnalysisCount(0);
    
    console.log('[FaceRec] ===== FACE RECOGNITION STOPPED =====');
  };

  useEffect(() => {
    return () => {
      console.log('[FaceRec] Component unmounting, cleaning up...');
      if (isActive) handleStop();
    };
  }, [isActive]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
      borderRadius: '16px',
      padding: '20px',
      border: '3px solid',
      borderColor: isActive ? '#10b981' : '#a78bfa',
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
      minWidth: '320px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '24px' }}>🎭</span>
          表情监控
        </h3>
        
        {!isActive ? (
          <button
            onClick={handleStart}
            disabled={isInitializing}
            style={{
              background: isInitializing ? '#9ca3af' : '#10b981',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: isInitializing ? 'not-allowed' : 'pointer',
              opacity: isInitializing ? 0.7 : 1,
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            {isInitializing ? '⏳ 连接中...' : '▶ 启动监控'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              background: '#ef4444',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              animation: 'pulse 2s infinite'
            }}
          >
            ⏹ 停止监控
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          borderRadius: '8px',
          fontSize: '13px',
          lineHeight: '1.5',
          whiteSpace: 'pre-line'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Session Info */}
      {sessionInfo && (
        <div style={{
          marginBottom: '12px',
          padding: '8px 12px',
          backgroundColor: '#ecfdf5',
          color: '#059669',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          ✅ {sessionInfo} | 已分析 {analysisCount} 帧
        </div>
      )}

      {/* Active State - Camera and Results */}
      {isActive && (
        <>
          {/* Camera View */}
          <div style={{
            position: 'relative',
            backgroundColor: '#000',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '16px',
            width: '320px',
            height: '240px',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
          }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)'
              }}
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {/* Live Indicator */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#fff',
                borderRadius: '50%',
                animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
              }}></span>
              LIVE
            </div>
            
            {/* Expression Overlay */}
            {currentExpression && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(4px)'
              }}>
                <span style={{ fontSize: '20px' }}>
                  {expressionEmojis[currentExpression.expression]}
                </span>
                <span>{expressionNames[currentExpression.expression]}</span>
                <span style={{ 
                  opacity: 0.8,
                  fontSize: '12px',
                  fontWeight: 'normal'
                }}>
                  ({(currentExpression.confidence * 100).toFixed(0)}%)
                </span>
              </div>
            )}
          </div>

          {/* Results Panel */}
          {currentExpression && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Main Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '10px',
                  borderLeft: '4px solid #3b82f6'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    学习状态
                  </div>
                  <div style={{ 
                    fontSize: '15px', 
                    fontWeight: 'bold', 
                    color: '#1e40af' 
                  }}>
                    {currentExpression.learning_state.description}
                  </div>
                </div>
                
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '10px',
                  borderLeft: '4px solid #22c55e'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    参与度评分
                  </div>
                  <div style={{ 
                    fontSize: '15px', 
                    fontWeight: 'bold', 
                    color: '#15803d' 
                  }}>
                    {(currentExpression.engagement_score * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Intervention Alert */}
              {currentExpression.intervention && (
                <div style={{
                  padding: '14px',
                  backgroundColor: '#fffbeb',
                  borderRadius: '10px',
                  border: '2px solid #fbbf24',
                  animation: 'pulse 2s infinite'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'start',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold', 
                        color: '#b45309',
                        marginBottom: '4px'
                      }}>
                        需要关注！{currentExpression.intervention.state === 'confused' ? '学生困惑' : 
                                  currentExpression.intervention.state === 'frustrated' ? '学生遇到困难' : 
                                  '学生注意力分散'}
                      </div>
                      <ul style={{ 
                        margin: 0, 
                        paddingLeft: '16px',
                        fontSize: '13px',
                        color: '#d97706',
                        listStyleType: 'disc'
                      }}>
                        {currentExpression.intervention.suggestions.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Confidence Bar */}
              <div style={{
                padding: '10px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>识别置信度</span>
                  <span style={{ fontWeight: '600' }}>
                    {(currentExpression.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${currentExpression.confidence * 100}%`,
                    height: '100%',
                    background: currentExpression.confidence > 0.8 ? '#22c55e' :
                               currentExpression.confidence > 0.6 ? '#84cc16' :
                               currentExpression.confidence > 0.4 ? '#eab308' : '#ef4444',
                    transition: 'width 0.3s ease-out',
                    borderRadius: '4px'
                  }}></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Inactive State */}
      {!isActive && !error && !isInitializing && (
        <div style={{ 
          textAlign: 'center', 
          padding: '32px 16px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
          <div style={{ fontWeight: '500', marginBottom: '8px' }}>
            点击「启动监控」开始实时表情分析
          </div>
          <div style={{ fontSize: '12px', opacity: 0.75 }}>
            需要允许浏览器访问摄像头<br/>
            分析间隔：300ms | 支持表情：8种
          </div>
          
          {/* Feature List */}
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'left',
            fontSize: '12px',
            color: '#9ca3af'
          }}>
            <div style={{ marginBottom: '6px' }}>✓ 实时表情识别</div>
            <div style={{ marginBottom: '6px' }}>✓ 学习状态分析</div>
            <div style={{ marginBottom: '6px' }}>✓ 参与度评估</div>
            <div style={{ marginBottom: '6px' }}>✓ 干预触发机制</div>
            <div>✓ 教学策略建议</div>
          </div>
        </div>
      )}

      {/* Initializing State */}
      {isInitializing && (
        <div style={{ 
          textAlign: 'center', 
          padding: '32px 16px',
          color: '#6b7280'
        }}>
          <div style={{ 
            fontSize: '36px', 
            marginBottom: '12px',
            animation: 'spin 1s linear infinite',
            display: 'inline-block'
          }}>⚙️</div>
          <div style={{ fontWeight: '500' }}>正在连接到人脸识别服务...</div>
          <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px' }}>
            请稍候，首次连接可能需要几秒钟
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .7;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

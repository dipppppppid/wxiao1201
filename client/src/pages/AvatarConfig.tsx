import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, TestTube } from "lucide-react";

export default function AvatarConfig() {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [accessKeySecret, setAccessKeySecret] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");

  const { data: config, isLoading: configLoading } = trpc.avatar.getConfig.useQuery();
  const saveConfig = trpc.avatar.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("配置保存成功");
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const testConnection = trpc.avatar.testConnection.useMutation({
    onSuccess: () => {
      toast.success("连接测试成功!");
    },
    onError: (error) => {
      toast.error(`连接测试失败: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!accessKeyId || !accessKeySecret) {
      toast.error("请填写完整的AccessKey信息");
      return;
    }

    saveConfig.mutate({
      accessKeyId,
      accessKeySecret,
      avatarId: avatarId || undefined,
      voiceId: voiceId || undefined,
    });
  };

  const handleTest = () => {
    if (!accessKeyId || !accessKeySecret) {
      toast.error("请先填写AccessKey信息");
      return;
    }

    testConnection.mutate({
      accessKeyId,
      accessKeySecret,
    });
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">虚拟人配置</h1>
          <p className="text-muted-foreground mt-2">
            配置阿里云通义灵眸虚拟人服务
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>阿里云访问凭证</CardTitle>
            <CardDescription>
              请输入您的阿里云AccessKey ID和AccessKey Secret。
              <a
                href="https://ram.console.aliyun.com/manage/ak"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                获取AccessKey
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessKeyId">AccessKey ID</Label>
              <Input
                id="accessKeyId"
                type="text"
                placeholder="LTAI..."
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessKeySecret">AccessKey Secret</Label>
              <Input
                id="accessKeySecret"
                type="password"
                placeholder="请输入AccessKey Secret"
                value={accessKeySecret}
                onChange={(e) => setAccessKeySecret(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTest}
                variant="outline"
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    测试连接
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>虚拟人形象配置</CardTitle>
            <CardDescription>
              选择虚拟人形象和语音。您可以在
              <a
                href="https://lingmou.console.aliyun.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline mx-1"
              >
                灵眸控制台
              </a>
              创建和管理虚拟人形象。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="avatarId">虚拟人形象ID (可选)</Label>
              <Input
                id="avatarId"
                type="text"
                placeholder="例如: avatar_xxx"
                value={avatarId}
                onChange={(e) => setAvatarId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                留空将使用默认形象
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voiceId">语音ID (可选)</Label>
              <Select value={voiceId} onValueChange={setVoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择语音" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">默认语音</SelectItem>
                  <SelectItem value="zhixiaobai">知小白(女声)</SelectItem>
                  <SelectItem value="zhiyan">知燕(女声)</SelectItem>
                  <SelectItem value="zhiyuan">知渊(男声)</SelectItem>
                  <SelectItem value="zhichu">知楚(男声)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>1. 在阿里云RAM控制台创建AccessKey</p>
            <p>2. 确保您的账号已开通灵眸数字人服务</p>
            <p>3. 在灵眸控制台创建数字人形象(可选)</p>
            <p>4. 填写上述配置信息并点击"测试连接"验证</p>
            <p>5. 测试成功后点击"保存配置"</p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存配置
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

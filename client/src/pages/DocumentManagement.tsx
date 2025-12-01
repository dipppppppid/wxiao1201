import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, FileText, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DocumentManagement() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [uploading, setUploading] = useState(false);

  const { data: documents, refetch } = trpc.docs.list.useQuery();
  const uploadMutation = trpc.docs.upload.useMutation();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件大小不能超过10MB");
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1];

        try {
          await uploadMutation.mutateAsync({
            fileName: file.name,
            fileContent: base64Data!,
            fileType: file.type,
          });

          toast.success("文档上传成功!");
          refetch();
        } catch (err) {
          toast.error("文档上传失败");
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("读取文件失败");
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">知识库管理</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto py-8 space-y-6">
        {/* Upload section */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">上传文档</h2>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={handleFileUpload}
              disabled={uploading}
              className="max-w-md"
            />
            <Button disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "上传中..." : "选择文件"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            支持格式: PDF, DOCX, TXT, MD (最大10MB)
          </p>
        </Card>

        {/* Documents list */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">已上传文档</h2>
          
          {!documents || documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无文档</p>
              <p className="text-sm mt-2">上传文档以构建知识库</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>文档名称</TableHead>
                  <TableHead>文件类型</TableHead>
                  <TableHead>Token数量</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.fileType || "未知"}</TableCell>
                    <TableCell>{doc.tokenCount?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  );
}

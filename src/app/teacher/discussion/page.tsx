"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button } from "@/components/ui";
import { useSession } from "next-auth/react";

export default function DiscussionPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userName = session?.user?.name;
  const [posts, setPosts] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async (classId?: string) => {
    if (!userId) return;
    setLoading(true);
    let query = supabase
      .from("discussions")
      .select("*, users(name, role), replies:discussions!parent_id(*, users(name, role))")
      .is("parent_id", null)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (classId) query = query.eq("class_id", classId);
    const { data } = await query;
    setPosts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    supabase.from("teacher_classes").select("classes(id, name)").eq("teacher_id", userId).then(({ data }) => {
      const cls = data?.map((tc: any) => tc.classes).filter(Boolean) ?? [];
      setClasses(cls);
      if (cls.length > 0) { setSelectedClass(cls[0].id); load(cls[0].id); }
      else load();
    });
  }, [userId]);

  const handlePost = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    await supabase.from("discussions").insert({
      author_id: userId,
      class_id: selectedClass || null,
      content,
    });
    setContent("");
    setSubmitting(false);
    load(selectedClass);
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    await supabase.from("discussions").insert({
      author_id: userId,
      class_id: selectedClass || null,
      content: replyContent,
      parent_id: parentId,
    });
    setReplyContent("");
    setReplyTo(null);
    setSubmitting(false);
    load(selectedClass);
  };

  const handlePin = async (id: string, current: boolean) => {
    await supabase.from("discussions").update({ is_pinned: !current }).eq("id", id);
    load(selectedClass);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>讨论区</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>查看学生讨论，回答问题</p>
      </div>

      {classes.length > 0 && (
        <div className="flex gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedClass(c.id); load(c.id); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: selectedClass === c.id ? "var(--accent)" : "var(--card)",
                color: selectedClass === c.id ? "#fff" : "var(--foreground)",
                border: `1px solid ${selectedClass === c.id ? "var(--accent)" : "var(--card-border)"}`,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Post box */}
      <Card>
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="发表回复或公告..."
            className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none resize-none"
            style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handlePost} loading={submitting} disabled={!content.trim()}>发布</Button>
          </div>
        </div>
      </Card>

      {/* Posts */}
      {loading ? (
        <Card><p className="text-center py-4" style={{ color: "var(--muted)" }}>加载中...</p></Card>
      ) : posts.length === 0 ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>暂无讨论</p></Card>
      ) : posts.map((post) => (
        <Card key={post.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: post.users?.role === "TEACHER" ? "var(--accent)" : "#3b82f6" }}
              >
                {post.users?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{post.users?.name}</span>
                  {post.is_pinned && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>置顶</span>}
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(post.created_at).toLocaleString("zh-CN")}</span>
                </div>
                <p className="text-sm" style={{ color: "var(--foreground)" }}>{post.content}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handlePin(post.id, post.is_pinned)}
                className="text-xs px-2 py-1 rounded transition-all"
                style={{ color: post.is_pinned ? "var(--accent)" : "var(--muted)", border: "1px solid var(--card-border)" }}
              >
                {post.is_pinned ? "取消置顶" : "置顶"}
              </button>
              <button
                onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
                className="text-xs px-2 py-1 rounded transition-all"
                style={{ color: "var(--muted)", border: "1px solid var(--card-border)" }}
              >
                回复
              </button>
            </div>
          </div>

          {/* Replies */}
          {post.replies && post.replies.length > 0 && (
            <div className="mt-3 ml-11 space-y-2">
              {post.replies.map((reply: any) => (
                <div key={reply.id} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "var(--background)" }}>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: reply.users?.role === "TEACHER" ? "var(--accent)" : "#3b82f6" }}
                  >
                    {reply.users?.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{reply.users?.name}</span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(reply.created_at).toLocaleString("zh-CN")}</span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "var(--foreground)" }}>{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply box */}
          {replyTo === post.id && (
            <div className="mt-3 ml-11 flex gap-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
                placeholder="写下回复..."
                className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none resize-none"
                style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
              />
              <Button size="sm" onClick={() => handleReply(post.id)} loading={submitting} disabled={!replyContent.trim()}>发送</Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

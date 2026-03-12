"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, Button } from "@/components/ui";
import { useSession } from "next-auth/react";

export default function StudentDiscussionPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [posts, setPosts] = useState<any[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (cid: string) => {
    const { data } = await supabase
      .from("discussions")
      .select("*, users(name, role), replies:discussions!parent_id(*, users(name, role))")
      .eq("class_id", cid)
      .is("parent_id", null)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    supabase.from("enrollments").select("class_id").eq("student_id", userId).single().then(({ data }) => {
      if (data?.class_id) { setClassId(data.class_id); load(data.class_id); }
      else setLoading(false);
    });
  }, [userId]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!classId) return;
    intervalRef.current = setInterval(() => load(classId), 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [classId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const fd = new FormData();
    fd.append("file", imageFile);
    try {
      const res = await fetch("/api/upload-discussion-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return null;
      return data.publicUrl as string;
    } catch {
      return null;
    }
  };

  const handlePost = async () => {
    if (!content.trim() || !classId) return;
    setSubmitting(true);
    const imageUrl = image ? await uploadImage() : null;
    await supabase.from("discussions").insert({
      author_id: userId, class_id: classId, content,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    });
    setContent("");
    setImage(null);
    setImageFile(null);
    setSubmitting(false);
    load(classId);
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !classId) return;
    setSubmitting(true);
    await supabase.from("discussions").insert({ author_id: userId, class_id: classId, content: replyContent, parent_id: parentId });
    setReplyContent("");
    setReplyTo(null);
    setSubmitting(false);
    load(classId);
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    setLikingId(postId);
    await supabase.from("discussions").update({ likes: (currentLikes ?? 0) + 1 }).eq("id", postId);
    if (classId) load(classId);
    setLikingId(null);
  };

  const handleEditSave = async (id: string) => {
    if (!editContent.trim()) return;
    let newImageUrl = editImageUrl; // null if user removed it, existing URL if kept
    if (editImageFile) {
      const fd = new FormData();
      fd.append("file", editImageFile);
      try {
        const res = await fetch("/api/upload-discussion-image", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) newImageUrl = data.publicUrl;
      } catch { /* keep existing */ }
    }
    await supabase.from("discussions").update({
      content: editContent,
      image_url: newImageUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("author_id", userId);
    setEditingId(null);
    setEditImageFile(null);
    setEditImagePreview(null);
    if (classId) load(classId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认撤回该内容？此操作不可恢复。")) return;
    await supabase.from("discussions").delete().eq("id", id).eq("author_id", userId);
    if (classId) load(classId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>讨论区</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>向同学和老师提问，互相交流学习 · 每15秒自动刷新</p>
      </div>

      {/* Post box */}
      <Card>
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="分享你的问题或想法…"
            className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none resize-none"
            style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
          />
          {image && (
            <div className="flex items-center gap-2">
              <img src={image} alt="preview" className="h-20 rounded-lg object-cover" />
              <button onClick={() => { setImage(null); setImageFile(null); }} className="text-xs" style={{ color: "var(--muted)" }}>× 移除</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <label className="cursor-pointer flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              添加图片
            </label>
            <Button size="sm" onClick={handlePost} loading={submitting} disabled={!content.trim()}>发布</Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>加载中...</p></Card>
      ) : posts.length === 0 ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>暂无讨论，来发第一条吧！</p></Card>
      ) : posts.map((post) => (
        <Card key={post.id}>
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: post.users?.role === "TEACHER" ? "var(--accent)" : "#3b82f6" }}
            >
              {post.users?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{post.users?.name}</span>
                {post.users?.role === "TEACHER" && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--accent)", color: "#fff" }}>教师</span>
                )}
                {post.is_pinned && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>置顶</span>}
                <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(post.created_at).toLocaleString("zh-CN")}</span>                  {post.updated_at && (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>· 已编辑于 {new Date(post.updated_at).toLocaleString("zh-CN")}</span>
                  )}              </div>
              {editingId === post.id ? (
                <div className="mt-1 space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none resize-none"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
                  />
                  {/* existing / new image preview */}
                  {(editImagePreview || editImageUrl) && (
                    <div className="flex items-center gap-2">
                      <img src={editImagePreview ?? editImageUrl!} alt="预览" className="h-20 rounded-lg object-cover" />
                      <button
                        onClick={() => { setEditImageUrl(null); setEditImageFile(null); setEditImagePreview(null); }}
                        className="text-xs" style={{ color: "var(--muted)" }}
                      >× 移除</button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <label className="cursor-pointer flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setEditImageFile(f);
                        const r = new FileReader(); r.onload = () => setEditImagePreview(r.result as string); r.readAsDataURL(f);
                      }} />
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      更换图片
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEditSave(post.id)}>保存</Button>
                      <Button size="sm" variant="secondary" onClick={() => { setEditingId(null); setEditImageFile(null); setEditImagePreview(null); }}>取消</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm" style={{ color: "var(--foreground)" }}>{post.content}</p>
                  {post.image_url && (
                    <img src={post.image_url} alt="图片" className="mt-2 max-w-xs rounded-xl" />
                  )}
                </>
              )}

              {/* Like + Reply + Edit/Delete actions */}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <button
                  onClick={() => handleLike(post.id, post.likes ?? 0)}
                  disabled={likingId === post.id}
                  className="flex items-center gap-1 text-xs transition hover:opacity-70"
                  style={{ color: "var(--muted)" }}
                >
                  赞 <span>{post.likes ?? 0}</span>
                </button>
                <button
                  onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {replyTo === post.id ? "收起" : "↩ 回复"}
                </button>
                {post.author_id === userId && editingId !== post.id && (
                  <>
                    <button
                      onClick={() => { setEditingId(post.id); setEditContent(post.content); setEditImageUrl(post.image_url ?? null); setEditImageFile(null); setEditImagePreview(null); }}
                      className="text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs"
                      style={{ color: "#ef4444" }}
                    >
                      撤回
                    </button>
                  </>
                )}
              </div>

              {/* Replies */}
              {post.replies && post.replies.length > 0 && (
                <div className="mt-3 space-y-2">
                  {post.replies.map((r: any) => (
                    <div key={r.id} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "var(--background)" }}>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: r.users?.role === "TEACHER" ? "var(--accent)" : "#3b82f6" }}
                      >
                        {r.users?.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{r.users?.name}</span>
                          {r.users?.role === "TEACHER" && <span className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--accent)", color: "#fff" }}>教师</span>}
                          <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(r.created_at).toLocaleString("zh-CN")}</span>
                          {r.updated_at && (
                            <span className="text-xs" style={{ color: "var(--muted)" }}>· 已编辑于 {new Date(r.updated_at).toLocaleString("zh-CN")}</span>
                          )}
                        </div>
                        {editingId === r.id ? (
                          <div className="mt-1 space-y-1.5">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={2}
                              className="w-full px-2 py-1.5 rounded-lg text-sm border focus:outline-none resize-none"
                              style={{ background: "var(--card)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
                            />
                            {(editImagePreview || editImageUrl) && (
                              <div className="flex items-center gap-2">
                                <img src={editImagePreview ?? editImageUrl!} alt="预览" className="h-16 rounded-lg object-cover" />
                                <button onClick={() => { setEditImageUrl(null); setEditImageFile(null); setEditImagePreview(null); }} className="text-xs" style={{ color: "var(--muted)" }}>× 移除</button>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <label className="cursor-pointer flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                  const f = e.target.files?.[0]; if (!f) return;
                                  setEditImageFile(f);
                                  const rd = new FileReader(); rd.onload = () => setEditImagePreview(rd.result as string); rd.readAsDataURL(f);
                                }} />
                                更换图片
                              </label>
                              <div className="flex gap-1.5">
                                <Button size="sm" onClick={() => handleEditSave(r.id)}>保存</Button>
                                <Button size="sm" variant="secondary" onClick={() => { setEditingId(null); setEditImageFile(null); setEditImagePreview(null); }}>取消</Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm mt-0.5" style={{ color: "var(--foreground)" }}>{r.content}</p>
                            {r.image_url && (
                              <img src={r.image_url} alt="图片" className="mt-1.5 max-w-xs rounded-xl" />
                            )}
                            {r.author_id === userId && (
                              <div className="flex gap-3 mt-1">
                                <button onClick={() => { setEditingId(r.id); setEditContent(r.content); setEditImageUrl(r.image_url ?? null); setEditImageFile(null); setEditImagePreview(null); }} className="text-xs" style={{ color: "var(--muted)" }}>编辑</button>
                                <button onClick={() => handleDelete(r.id)} className="text-xs" style={{ color: "#ef4444" }}>撤回</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {replyTo === post.id && (
                <div className="mt-2 flex gap-2">
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
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

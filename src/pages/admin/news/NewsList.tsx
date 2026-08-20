import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminEmpty, AdminHeader, AdminPager, AdminSearch, ActionsMenu, StatusBadge, useAdminList } from '@/components/admin/AdminChrome'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { useContent } from '@/hooks/useContent'
import { newsService, writeMessage, conflictText } from '@/services/collections'
import { formatDate } from '@/utils'
import { useToast } from '@/components/admin/Toast'
import { mediaUrl } from '@/services/normalize'
import { deleteConfirmCopy } from '@/services/approvals'

export function NewsList() {
  const { news } = useContent()
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = useState('All')
  const [category, setCategory] = useState('All')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const filtered = useMemo(() => {
    return [...news]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((n) => (status === 'All' || n.status === status) && (category === 'All' || n.category === category))
  }, [news, status, category])
  const { query, setQuery, page, setPage, paged } = useAdminList(
    filtered,
    10,
    (n, q) => n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q),
  )

  return (
    <div>
      <AdminHeader title="News" description="Create, edit and publish school stories. Changes appear on the public News pages and homepage." addLabel="Add Story" addTo="/admin/news/new" />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <AdminSearch value={query} onChange={setQuery} placeholder="Search news..." />
        <select className="rounded-md border border-brand/20 bg-white px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          {['All', 'Academic', 'Sports', 'Events', 'Achievements', 'Student Life', 'Community', 'Announcements', 'General'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="rounded-md border border-brand/20 bg-white px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {['All', 'draft', 'published', 'archived'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      {paged.total === 0 ? (
        <AdminEmpty title="No news stories yet" body="Create your first news story to begin publishing school updates." actionLabel="Add Story" actionTo="/admin/news/new" />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-brand text-white">
              <tr>
                <th className="px-3 py-2 font-medium">Image</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Author</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Published</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium">Home</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.items.map((article) => (
                <tr key={article.id} className="border-b border-brand/10">
                  <td className="px-3 py-2">
                    {mediaUrl(article.featuredImage) || article.image ? (
                      <img src={mediaUrl(article.featuredImage) || article.image} alt="" className="h-12 w-16 rounded object-cover" />
                    ) : <div className="h-12 w-16 rounded bg-cream" />}
                  </td>
                  <td className="max-w-xs break-words px-3 py-2 font-medium text-brand">{article.title}</td>
                  <td className="px-3 py-2">{article.category}</td>
                  <td className="px-3 py-2">{article.author}</td>
                  <td className="px-3 py-2"><StatusBadge status={article.status} /></td>
                  <td className="px-3 py-2">{article.publishedAt ? formatDate(article.publishedAt) : '—'}</td>
                  <td className="px-3 py-2">{formatDate(article.updatedAt)}</td>
                  <td className="px-3 py-2">{article.showOnHomepage ? 'Yes' : '—'}</td>
                  <td className="px-3 py-2">
                    <ActionsMenu
                      items={[
                        { label: 'View', onClick: () => navigate(`/admin/news/${article.id}`) },
                        { label: 'Edit', onClick: () => navigate(`/admin/news/${article.id}/edit`) },
                        { label: 'View history', onClick: () => navigate(`/admin/activity/resource/news/${article.id}`) },
                        { label: 'Preview', onClick: () => window.open(`/news/${article.slug}?preview=1`, '_blank') },
                        { label: 'Duplicate', onClick: async () => {
                          try {
                            const result = await newsService.duplicate(article.id)
                            if (result) toast.push(writeMessage(result, 'Story duplicated as a draft.'))
                          } catch (err) {
                            toast.push(conflictText(err), 'error')
                          }
                        } },
                        { label: article.status === 'published' ? 'Unpublish' : 'Publish', onClick: async () => {
                          try {
                            const result = await newsService.save({ ...article, status: article.status === 'published' ? 'draft' : 'published', publishedAt: article.publishedAt || new Date().toISOString().slice(0, 10), date: article.date })
                            toast.push(writeMessage(result, article.status === 'published' ? 'Story unpublished.' : 'Story published.'))
                          } catch (err) {
                            toast.push(conflictText(err), 'error')
                          }
                        } },
                        { label: 'Delete', danger: true, onClick: () => setDeleteId(article.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdminPager page={paged.page} totalPages={paged.totalPages} total={paged.total} perPage={10} onChange={setPage} />
      <ConfirmDialog
        open={Boolean(deleteId)}
        title={deleteConfirmCopy().title}
        body={deleteConfirmCopy().body}
        confirmLabel={deleteConfirmCopy().confirmLabel}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return
          try {
            const result = await newsService.remove(deleteId)
            toast.push(writeMessage(result, 'News story deleted.'))
          } catch (err) {
            toast.push(conflictText(err), 'error')
          }
          setDeleteId(null)
        }}
      />
    </div>
  )
}

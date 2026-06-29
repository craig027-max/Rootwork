import { useEffect, useState } from 'react';
import { useWondralStore } from '../app/store';
import { hydrateActiveStudent } from '../core/hydrate';
import { getAllStudentProgress } from '../core/progress';
import { AVATARS, DEFAULT_AVATAR } from '../data/avatars';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { Badge } from './components/Badge';
import { Chip } from './components/Chip';

/**
 * Parent dashboard — the roster of student profiles. Add / rename / remove
 * students and pick who is "learning as" right now (which namespaces progress).
 * Per-student completion counts are grouped from the parent's own progress rows.
 */
export function ParentDashboard() {
  const students = useWondralStore((s) => s.students);
  const activeStudentId = useWondralStore((s) => s.activeStudentId);
  const setActiveStudent = useWondralStore((s) => s.setActiveStudent);
  const addStudent = useWondralStore((s) => s.addStudent);
  const renameStudent = useWondralStore((s) => s.renameStudent);
  const removeStudent = useWondralStore((s) => s.removeStudent);
  const setView = useWondralStore((s) => s.setView);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await getAllStudentProgress();
        if (cancelled) return;
        const c: Record<string, number> = {};
        for (const r of rows) {
          if (r.completed && r.student_id) c[r.student_id] = (c[r.student_id] ?? 0) + 1;
        }
        setCounts(c);
      } catch {
        // best-effort — dashboard still works without counts
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [students.length]);

  async function add() {
    const name = nickname.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const stu = await addStudent(name, avatar);
      if (stu) {
        setNickname('');
        setAvatar(DEFAULT_AVATAR);
      }
    } catch (err) {
      setError((err as Error).message || 'Could not add student.');
    } finally {
      setBusy(false);
    }
  }

  function startLearning(id: string) {
    setActiveStudent(id);
    void hydrateActiveStudent();
    setView('home');
  }

  async function rename(id: string, current: string) {
    const next = window.prompt('Rename student', current);
    if (next && next.trim() && next.trim() !== current) {
      try {
        await renameStudent(id, next.trim());
      } catch {
        /* ignore */
      }
    }
  }

  async function remove(id: string, name: string) {
    if (window.confirm(`Remove ${name}? Their progress will be deleted.`)) {
      try {
        await removeStudent(id);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="ww-stack" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div>
        <p className="ww-eyebrow">Parent dashboard</p>
        <h1 className="text-gradient-hero">Your learners</h1>
      </div>

      {students.length === 0 ? (
        <div className="ww-notice">
          No students yet. Add your first learner below to start tracking their progress.
        </div>
      ) : (
        <div className="ww-stack">
          {students.map((stu) => (
            <Card key={stu.id} className="ww-row" style={{ justifyContent: 'space-between' }}>
              <div className="ww-row">
                <span aria-hidden="true" style={{ fontSize: 28 }}>
                  {stu.avatar}
                </span>
                <div>
                  <strong style={{ fontFamily: 'var(--font-display)' }}>{stu.nickname}</strong>
                  <div className="ww-lock">{counts[stu.id] ?? 0} roots learned</div>
                </div>
                {activeStudentId === stu.id ? (
                  <Badge variant="solid" jewel="jade">
                    Learning as
                  </Badge>
                ) : null}
              </div>
              <div className="ww-row">
                <Button size="sm" onClick={() => startLearning(stu.id)}>
                  Start
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void rename(stu.id, stu.nickname)}
                >
                  Rename
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void remove(stu.id, stu.nickname)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="ww-stack">
        <p className="ww-eyebrow">Add a student</p>
        {error ? (
          <div className="ww-notice is-error" role="alert">
            {error}
          </div>
        ) : null}
        <input
          className="ww-input"
          placeholder="Nickname"
          value={nickname}
          maxLength={30}
          onChange={(e) => setNickname(e.target.value)}
        />
        <div className="ww-row">
          {AVATARS.map((a) => (
            <Chip key={a} selected={avatar === a} onClick={() => setAvatar(a)}>
              {a}
            </Chip>
          ))}
        </div>
        <Button disabled={busy || !nickname.trim()} onClick={() => void add()}>
          {busy ? 'Adding…' : 'Add student'}
        </Button>
      </Card>

      <div className="ww-row">
        <Button variant="ghost" onClick={() => setView('home')}>
          Back to learning
        </Button>
      </div>
    </div>
  );
}

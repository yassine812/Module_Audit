from django.db import models
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
import json
from .models import TypeAudit, TextRef, ChapitreNorme, Critere, SousCritere, TypePreuve, TypeCotation, Cotation, FormulaireAudit, ListeAudit, ResultatAudit, PreuveAttendu, SousCritereTypeAudit, FormulaireSousCritere
from django.utils.decorators import method_decorator
from django.views import View
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION


@method_decorator(csrf_exempt, name='dispatch')
class LoginAPIView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                role = 'Participant'
                if user.is_superuser:
                    role = 'Admin'
                elif user.groups.filter(name='Auditeur').exists():
                    role = 'Auditeur'
                
                return JsonResponse({
                    'status': 'success',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'role': role
                    }
                })
            else:
                return JsonResponse({'status': 'error', 'message': 'Identifiants invalides'}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutAPIView(View):
    def post(self, request):
        logout(request)
        return JsonResponse({'status': 'success', 'message': 'Logged out successfully'})


@method_decorator(csrf_exempt, name='dispatch')
class UserListAPIView(View):
    def get(self, request):
        from django.contrib.auth.models import User
        users = User.objects.all()
        data = []
        for u in users:
            role = 'Participant'
            if u.is_superuser:
                role = 'Admin'
            elif u.groups.filter(name='Auditeur').exists():
                role = 'Auditeur'
            
            data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'role': role
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        from django.contrib.auth.models import User
        try:
            data = json.loads(request.body)
            user = User.objects.create_user(
                username=data['username'],
                email=data.get('email', ''),
                password='password123' # Default password
            )
            # Handle role
            role = data.get('role', 'Participant')
            if role == 'Admin':
                user.is_superuser = True
                user.is_staff = True
            elif role == 'Auditeur':
                from django.contrib.auth.models import Group
                group, _ = Group.objects.get_or_create(name='Auditeur')
                user.groups.add(group)
            user.save()
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': role
                }
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)








@method_decorator(csrf_exempt, name='dispatch')
class TypeAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        type_audits = TypeAudit.objects.prefetch_related('section').all()
        data = []
        for ta in type_audits:
            sections = list(ta.section.values('id', 'name'))
            section_names = ", ".join([s['name'] for s in sections])
            data.append({
                'id': ta.id,
                'name': ta.name,
                'sections': sections,
                'section_names': section_names or '-'
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            type_audit = TypeAudit.objects.create(name=data['name'])
            if data.get('sections'):
                type_audit.section.set(data['sections'])
            
            sections = list(type_audit.section.values('id', 'name'))
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_audit.id,
                    'name': type_audit.name,
                    'sections': sections,
                    'section_names': ", ".join([s['name'] for s in sections]) or '-'
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypeAuditDetailAPIView(View):
    def get(self, request, pk):
        # Temporarily removed authentication for testing
        try:
            type_audit = TypeAudit.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_audit.id,
                    'name': type_audit.name
                }
            })
        except TypeAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
    
    def put(self, request, pk):
        # Temporarily removed authentication for testing
        try:
            type_audit = TypeAudit.objects.get(pk=pk)
            data = json.loads(request.body)
            
            type_audit.name = data.get('name', type_audit.name)
            type_audit.save()
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_audit.id,
                    'name': type_audit.name
                }
            })
        except TypeAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    def delete(self, request, pk):
        # Temporarily removed authentication for testing
        try:
            type_audit = TypeAudit.objects.get(pk=pk)
            type_audit.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except TypeAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class ChapitreNormeListAPIView(View):
    def get(self, request):
        qs = ChapitreNorme.objects.select_related('text_ref').all()
        data = []
        for c in qs:
            data.append({
                'id': c.id,
                'name': c.name,
                'text_ref_id': c.text_ref.id if c.text_ref else None,
                'text_ref_norme': c.text_ref.norme if c.text_ref else 'N/A',
                'page': c.page
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            chapitre = ChapitreNorme.objects.create(
                name=data['name'],
                text_ref_id=data['text_ref'],
                page=data.get('page')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': chapitre.id,
                    'name': chapitre.name,
                    'text_ref': chapitre.text_ref.id if chapitre.text_ref else None,
                    'text_ref_norme': chapitre.text_ref.norme if chapitre.text_ref else 'N/A',
                    'page': chapitre.page
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class ChapitreNormeDetailAPIView(View):
    def get(self, request, pk):
        try:
            c = ChapitreNorme.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': c.id,
                    'name': c.name,
                    'text_ref': c.text_ref.id if c.text_ref else None,
                    'page': c.page
                }
            })
        except ChapitreNorme.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            c = ChapitreNorme.objects.get(pk=pk)
            data = json.loads(request.body)
            c.name = data.get('name', c.name)
            c.text_ref_id = data.get('text_ref', c.text_ref_id)
            c.page = data.get('page', c.page)
            c.save()
            return JsonResponse({'status': 'success', 'message': 'Updated successfully'})
        except ChapitreNorme.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            c = ChapitreNorme.objects.get(pk=pk)
            c.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except ChapitreNorme.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class CritereListAPIView(View):
    def get(self, request):
        qs = Critere.objects.select_related('chapitre_norme', 'formulaire').all()
        data = []
        for c in qs:
            data.append({
                'id': c.id,
                'name': c.name,
                'chapitre_norme_id': c.chapitre_norme.id if c.chapitre_norme else None,
                'chapitre_norme_name': c.chapitre_norme.name if c.chapitre_norme else '-',
                'formulaire_id': c.formulaire.id if c.formulaire else None,
                'formulaire_name': c.formulaire.name if c.formulaire else '-'
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign key exists
            try:
                ChapitreNorme.objects.get(id=data['chapitre_norme'])
            except ChapitreNorme.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'ChapitreNorme with id {data["chapitre_norme"]} does not exist'}, status=400)
            
            critere = Critere.objects.create(
                name=data['name'],
                chapitre_norme_id=data['chapitre_norme']
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': critere.id,
                    'name': critere.name,
                    'chapitre_norme': critere.chapitre_norme.id,
                    'chapitre_norme_name': critere.chapitre_norme.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class CritereDetailAPIView(View):
    def get(self, request, pk):
        try:
            c = Critere.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': c.id,
                    'name': c.name,
                    'chapitre_norme': c.chapitre_norme.id if c.chapitre_norme else None,
                    'formulaire': c.formulaire.id if c.formulaire else None
                }
            })
        except Critere.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            c = Critere.objects.get(pk=pk)
            data = json.loads(request.body)
            c.name = data.get('name', c.name)
            if 'chapitre_norme' in data: c.chapitre_norme_id = data['chapitre_norme']
            if 'formulaire' in data: c.formulaire_id = data['formulaire']
            c.save()
            return JsonResponse({'status': 'success', 'data': {'id': c.id, 'name': c.name}})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            c = Critere.objects.get(pk=pk)
            c.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypeCotationListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        type_cotations = TypeCotation.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(type_cotations)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            type_cotation = TypeCotation.objects.create(name=data['name'])
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_cotation.id,
                    'name': type_cotation.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class SousCritereListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        qs = SousCritere.objects.all().select_related('critere', 'type_cotation').prefetch_related('preuve_attendu', 'type_audit')
        data = []
        for sc in qs:
            data.append({
                'id': sc.id,
                'content': sc.content,
                'reaction': sc.reaction,
                'critere_id': sc.critere.id,
                'critere_name': sc.critere.name,
                'type_cotation_id': sc.type_cotation.id if sc.type_cotation else None,
                'type_cotation_name': sc.type_cotation.name if sc.type_cotation else '-',
                'preuves_attendues': list(sc.preuve_attendu.values('id', 'name')),
                'type_audits': list(sc.type_audit.values('id', 'name')),
                'type_audit_names': ", ".join([t.name for t in sc.type_audit.all()])
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign key exists
            try:
                Critere.objects.get(id=data['critere'])
            except Critere.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'Critere with id {data["critere"]} does not exist'}, status=400)
            
            # Optional: validate type_cotation if provided
            if 'type_cotation' in data:
                try:
                    TypeCotation.objects.get(id=data['type_cotation'])
                except TypeCotation.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': f'TypeCotation with id {data["type_cotation"]} does not exist'}, status=400)
            
            sous_critere = SousCritere.objects.create(
                content=data['content'],
                critere_id=data['critere'],
                reaction=data.get('reaction', ''),
                type_cotation_id=data.get('type_cotation')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': sous_critere.id,
                    'content': sous_critere.content,
                    'reaction': sous_critere.reaction,
                    'critere': sous_critere.critere.id,
                    'critere_name': sous_critere.critere.name,
                    'type_cotation': sous_critere.type_cotation.id if sous_critere.type_cotation else None,
                    'type_cotation_name': sous_critere.type_cotation.name if sous_critere.type_cotation else None
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class SousCritereDetailAPIView(View):
    def get(self, request, pk):
        try:
            sc = SousCritere.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': sc.id,
                    'content': sc.content,
                    'reaction': sc.reaction,
                    'critere_id': sc.critere.id,
                    'type_cotation_id': sc.type_cotation.id if sc.type_cotation else None
                }
            })
        except SousCritere.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            sc = SousCritere.objects.get(pk=pk)
            data = json.loads(request.body)
            sc.content = data.get('content', sc.content)
            sc.reaction = data.get('reaction', sc.reaction)
            if 'critere' in data: sc.critere_id = data['critere']
            if 'type_cotation' in data: sc.type_cotation_id = data['type_cotation']
            sc.save()
            return JsonResponse({'status': 'success', 'data': {'id': sc.id, 'content': sc.content}})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            sc = SousCritere.objects.get(pk=pk)
            sc.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class FormulaireAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        formulaires = FormulaireAudit.objects.all().select_related(
            'processus', 'type_audit', 'type_equipement'
        ).prefetch_related('section', 'liste_sous_criteres')
        
        data = []
        for f in formulaires:
            sections = list(f.section.values('id', 'name'))
            section_names = ", ".join([s['name'] for s in sections])
            
            data.append({
                'id': f.id,
                'name': f.name,
                'processus_id': f.processus.id if f.processus else None,
                'processus_name': f.processus.name if f.processus else '-',
                'type_audit_id': f.type_audit.id if f.type_audit else None,
                'type_audit_name': f.type_audit.name if f.type_audit else '-',
                'type_equipement_id': f.type_equipement.id if f.type_equipement else None,
                'type_equipement_name': f.type_equipement.name if f.type_equipement else '-',
                'section_names': section_names or '-',
                'sc_count': f.liste_sous_criteres.count(),
                'date_creation': f.date_creation.strftime('%d/%m/%Y %H:%M') if f.date_creation else '-'
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            formulaire = FormulaireAudit.objects.create(
                name=data['name'],
                processus_id=data.get('processus'),
                type_audit_id=data.get('type_audit'),
                type_equipement_id=data.get('type_equipement')
            )
            
            if data.get('sections'):
                formulaire.section.set(data['sections'])
                
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': formulaire.id,
                    'name': formulaire.name,
                    'date_creation': formulaire.date_creation.strftime('%d/%m/%Y %H:%M') if formulaire.date_creation else '-'
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class ListeAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        liste_audits = ListeAudit.objects.all().values('id', 'desc', 'status', 'number_audit')
        return JsonResponse({'status': 'success', 'data': list(liste_audits)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            liste_audit = ListeAudit.objects.create(
                desc=data['desc'],
                status=data.get('status', False),
                number_audit=data.get('number_audit', 0)
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': liste_audit.id,
                    'desc': liste_audit.desc,
                    'status': liste_audit.status,
                    'number_audit': liste_audit.number_audit
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class ResultatAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        resultats = ResultatAudit.objects.all().annotate(
            auditeur_name=models.F('auditeur__username'),
            formulaire_name=models.F('audit__formulaire_audit__name'),
            audit_desc=models.F('audit__desc'),
            departement_name=models.F('audit__section__name'),
            site_name=models.F('site__name')
        ).values(
            'id', 'ref_audit', 'audit', 'audit_desc', 'users', 'date_audit', 
            'score_audit', 'sujet', 'site', 'auditeur', 'auditeur_name', 
            'formulaire_name', 'reference_gamme', 'processus', 'departement_name', 'site_name', 'en_cours'
        )
        return JsonResponse({'status': 'success', 'data': list(resultats)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys exist
            try:
                ListeAudit.objects.get(id=data['audit'])
            except ListeAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'ListeAudit with id {data["audit"]} does not exist'}, status=400)
            
            try:
                from Organisation.models import Site
                if 'site' in data:
                    Site.objects.get(id=data['site'])
            except Site.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'Site with id {data["site"]} does not exist'}, status=400)
            
            try:
                from django.contrib.auth.models import User
                User.objects.get(id=data['auditeur'])
            except User.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'User with id {data["auditeur"]} does not exist'}, status=400)
            
            resultat = ResultatAudit.objects.create(
                ref_audit=data['ref_audit'],
                audit_id=data['audit'],
                users=data['users'],
                sujet=data['sujet'],
                site_id=data.get('site'),
                auditeur_id=data['auditeur'],
                reference_gamme=data.get('reference_gamme', ''),
                processus=data.get('processus', '')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': resultat.id,
                    'ref_audit': resultat.ref_audit,
                    'audit': resultat.audit.id,
                    'audit_desc': resultat.audit.desc,
                    'users': resultat.users,
                    'date_audit': resultat.date_audit,
                    'score_audit': resultat.score_audit,
                    'sujet': resultat.sujet,
                    'site': resultat.site.id if resultat.site else None,
                    'auditeur': resultat.auditeur.id,
                    'reference_gamme': resultat.reference_gamme,
                    'processus': resultat.processus
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypePreuveListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        type_preuves = TypePreuve.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(type_preuves)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            type_preuve = TypePreuve.objects.create(
                name=data['name']
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_preuve.id,
                    'name': type_preuve.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class PreuveAttenduListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        preuve_attendus = PreuveAttendu.objects.all().values(
            'id', 'name', 'type_preuve', 'type_preuve__name'
        )
        return JsonResponse({'status': 'success', 'data': list(preuve_attendus)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign key if provided
            if 'type_preuve' in data:
                try:
                    TypePreuve.objects.get(id=data['type_preuve'])
                except TypePreuve.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': f'TypePreuve with id {data["type_preuve"]} does not exist'}, status=400)
            
            preuve_attendu = PreuveAttendu.objects.create(
                name=data['name'],
                type_preuve_id=data.get('type_preuve')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': preuve_attendu.id,
                    'name': preuve_attendu.name,
                    'type_preuve': preuve_attendu.type_preuve.id if preuve_attendu.type_preuve else None,
                    'type_preuve_name': preuve_attendu.type_preuve.name if preuve_attendu.type_preuve else None
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class SousCritereTypeAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        sous_critere_type_audits = SousCritereTypeAudit.objects.all().values(
            'id', 'sous_critere', 'sous_critere__content', 
            'type_audit', 'type_audit__name', 'status'
        )
        return JsonResponse({'status': 'success', 'data': list(sous_critere_type_audits)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys
            try:
                SousCritere.objects.get(id=data['sous_critere'])
            except SousCritere.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'SousCritere with id {data["sous_critere"]} does not exist'}, status=400)
            
            try:
                TypeAudit.objects.get(id=data['type_audit'])
            except TypeAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'TypeAudit with id {data["type_audit"]} does not exist'}, status=400)
            
            sous_critere_type_audit = SousCritereTypeAudit.objects.create(
                sous_critere_id=data['sous_critere'],
                type_audit_id=data['type_audit'],
                status=data.get('status', 'optionnel')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': sous_critere_type_audit.id,
                    'sous_critere': sous_critere_type_audit.sous_critere.id,
                    'sous_critere_content': sous_critere_type_audit.sous_critere.content,
                    'type_audit': sous_critere_type_audit.type_audit.id,
                    'type_audit_name': sous_critere_type_audit.type_audit.name,
                    'status': sous_critere_type_audit.status
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class FormulaireSousCritereListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        formulaire_sous_criteres = FormulaireSousCritere.objects.all().values(
            'id', 'formulaire', 'formulaire__name', 
            'sous_critere', 'sous_critere__content', 'ordre'
        )
        return JsonResponse({'status': 'success', 'data': list(formulaire_sous_criteres)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys
            try:
                FormulaireAudit.objects.get(id=data['formulaire'])
            except FormulaireAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'FormulaireAudit with id {data["formulaire"]} does not exist'}, status=400)
            
            try:
                SousCritere.objects.get(id=data['sous_critere'])
            except SousCritere.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'SousCritere with id {data["sous_critere"]} does not exist'}, status=400)
            
            formulaire_sous_critere = FormulaireSousCritere.objects.create(
                formulaire_id=data['formulaire'],
                sous_critere_id=data['sous_critere'],
                ordre=data.get('ordre', 0)
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': formulaire_sous_critere.id,
                    'formulaire': formulaire_sous_critere.formulaire.id,
                    'formulaire_name': formulaire_sous_critere.formulaire.name,
                    'sous_critere': formulaire_sous_critere.sous_critere.id,
                    'sous_critere_content': formulaire_sous_critere.sous_critere.content,
                    'ordre': formulaire_sous_critere.ordre
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TextRefListAPIView(View):
    def get(self, request):
        text_refs = TextRef.objects.select_related('text_ref').all()
        data = []
        for tr in text_refs:
            data.append({
                'id': tr.id,
                'norme': tr.norme,
                'file_name': tr.text_ref.name if tr.text_ref else 'N/A',
                'file_url': tr.text_ref.content.url if tr.text_ref and tr.text_ref.content else None
            })
        return JsonResponse({'status': 'success', 'data': data})
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            text_ref = TextRef.objects.create(
                norme=data['norme'],
                text_ref_id=data.get('text_ref')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': text_ref.id,
                    'norme': text_ref.norme,
                    'file_name': text_ref.text_ref.name if text_ref.text_ref else 'N/A'
                }
            })
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)
        except KeyError as e:
            return JsonResponse({'status': 'error', 'message': f'Missing field: {str(e)}'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Server error: {str(e)}'}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class TextRefDetailAPIView(View):
    def get(self, request, pk):
        try:
            tr = TextRef.objects.select_related('text_ref').get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': tr.id,
                    'norme': tr.norme,
                    'text_ref': tr.text_ref.id if tr.text_ref else None,
                    'file_name': tr.text_ref.name if tr.text_ref else 'N/A'
                }
            })
        except TextRef.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            tr = TextRef.objects.get(pk=pk)
            data = json.loads(request.body)
            tr.norme = data.get('norme', tr.norme)
            tr.text_ref_id = data.get('text_ref', tr.text_ref_id)
            tr.save()
            return JsonResponse({'status': 'success', 'message': 'Updated successfully'})
        except TextRef.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            tr = TextRef.objects.get(pk=pk)
            tr.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except TextRef.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

@method_decorator(csrf_exempt, name='dispatch')
class ActivityAPIView(View):
    def get(self, request):
        activities = LogEntry.objects.select_related('user', 'content_type').order_by('-action_time')[:10]
        data = []
        for activity in activities:
            action_type = 'add' if activity.action_flag == ADDITION else 'edit' if activity.action_flag == CHANGE else 'delete'
            data.append({
                'id': activity.id,
                'action_time': activity.action_time,
                'user': activity.user.username,
                'model': activity.content_type.model,
                'object_repr': activity.object_repr,
                'action_flag': activity.action_flag,
                'action_type': action_type,
                'change_message': activity.change_message
            })
        return JsonResponse({'status': 'success', 'data': data})
@method_decorator(csrf_exempt, name='dispatch')
class DashboardStatsAPIView(View):
    def get(self, request):
        try:
            stats = {
                'type_audits': TypeAudit.objects.count(),
                'text_refs': TextRef.objects.count(),
                'formulaires': FormulaireAudit.objects.count(),
                'liste_audits': ListeAudit.objects.count(),
                'resultats': ResultatAudit.objects.count(),
            }
            return JsonResponse({'status': 'success', 'data': stats})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class ChartDataAPIView(View):
    def get(self, request):
        try:
            year = int(request.GET.get('year', 2026))
            labels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
            
            datasets = {
                'types_audit': [0] * 12,
                'formulaires': [0] * 12,
                'audits_planifies': [0] * 12,
                'resultats': [0] * 12,
            }

            # Fill data (Simple count for now, can be improved with created_at filtering)
            # Since we might not have created_at on all models, we just provide the total spread out
            # Or better, if models have auto_now_add=True
            
            # Example for ResultatAudit which likely has date_audit
            res = ResultatAudit.objects.filter(date_audit__year=year)
            for item in res:
                if item.date_audit:
                    month = item.date_audit.month
                    datasets['resultats'][month-1] += 1

            # For others, if they don't have dates, we'll just put them in current month for demo
            import datetime
            now = datetime.datetime.now()
            current_month = now.month
            
            # Use current month if year matches, otherwise don't show
            if year == now.year:
                datasets['types_audit'][current_month-1] = TypeAudit.objects.count()
                datasets['formulaires'][current_month-1] = FormulaireAudit.objects.count()
                datasets['audits_planifies'][current_month-1] = ListeAudit.objects.count()

            return JsonResponse({
                'status': 'success',
                'labels': labels,
                'datasets': datasets
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class CotationListAPIView(View):
    def get(self, request):
        cotations = Cotation.objects.all().select_related('type_cotation')
        data = []
        for c in cotations:
            data.append({
                'id': c.id,
                'valeur': c.valeur,
                'content': c.content,
                'code': c.code,
                'type_cotation_id': c.type_cotation.id if c.type_cotation else None,
                'type_cotation_name': c.type_cotation.name if c.type_cotation else None
            })
        return JsonResponse({'status': 'success', 'data': data})

    def post(self, request):
        try:
            data = json.loads(request.body)
            c = Cotation.objects.create(
                valeur=data['valeur'],
                content=data['content'],
                code=data['code'],
                type_cotation_id=data.get('type_cotation')
            )
            return JsonResponse({'status': 'success', 'message': 'Created'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def put(self, request, pk):
        try:
            c = Cotation.objects.get(pk=pk)
            data = json.loads(request.body)
            c.valeur = data.get('valeur', c.valeur)
            c.content = data.get('content', c.content)
            c.code = data.get('code', c.code)
            c.type_cotation_id = data.get('type_cotation', c.type_cotation_id)
            c.save()
            return JsonResponse({'status': 'success', 'message': 'Updated'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            c = Cotation.objects.get(pk=pk)
            c.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class FormulaireAuditDetailAPIView(View):
    def get(self, request, pk):
        try:
            f = FormulaireAudit.objects.get(pk=pk)
            return JsonResponse({'status': 'success', 'data': {'id': f.id, 'name': f.name}})
        except FormulaireAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            f = FormulaireAudit.objects.get(pk=pk)
            data = json.loads(request.body)
            f.name = data.get('name', f.name)
            f.save()
            return JsonResponse({'status': 'success', 'data': {'id': f.id, 'name': f.name}})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            f = FormulaireAudit.objects.get(pk=pk)
            f.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypeCotationDetailAPIView(View):
    def get(self, request, pk):
        try:
            tc = TypeCotation.objects.get(pk=pk)
            return JsonResponse({'status': 'success', 'data': {'id': tc.id, 'name': tc.name}})
        except TypeCotation.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            tc = TypeCotation.objects.get(pk=pk)
            data = json.loads(request.body)
            tc.name = data.get('name', tc.name)
            tc.save()
            return JsonResponse({'status': 'success', 'data': {'id': tc.id, 'name': tc.name}})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            tc = TypeCotation.objects.get(pk=pk)
            tc.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class SousCritereDetailAPIView(View):
    def get(self, request, pk):
        try:
            sc = SousCritere.objects.get(pk=pk)
            return JsonResponse({'status': 'success', 'data': {'id': sc.id, 'content': sc.content}})
        except SousCritere.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)

    def put(self, request, pk):
        try:
            sc = SousCritere.objects.get(pk=pk)
            data = json.loads(request.body)
            sc.content = data.get('content', sc.content)
            sc.save()
            return JsonResponse({'status': 'success', 'data': {'id': sc.id}})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    def delete(self, request, pk):
        try:
            sc = SousCritere.objects.get(pk=pk)
            sc.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
